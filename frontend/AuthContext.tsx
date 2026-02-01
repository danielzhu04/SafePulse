import React, { createContext, useContext, useMemo, useState, useRef } from "react";
import { Linking } from "react-native";
import type { User } from "../api/types";
import { setAuthToken } from "../api/client";
import { API, registerSafewalker, getDeviceInfoForRegistration } from "../api/endpoints";
import { startStatusHeartbeat, stopStatusHeartbeat } from "../api/statusHeartbeat";

type ActiveRequestSummary = {
  requestId: string;
  status: "MATCHING" | "ASSIGNED" | "WALKING";
  etaSeconds?: number | null;
  studentCode?: string;
  safewalkerCode?: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

  activeRequest: ActiveRequestSummary | null;
  setActiveRequest: (r: ActiveRequestSummary | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] =
    useState<ActiveRequestSummary | null>(null);

  // Track if user just logged out to prevent auto-re-authentication
  const justLoggedOutRef = useRef(false);

  /**
   * Helper to fetch current session & user attributes, then update state.
   * Returns true if successfully authenticated, false otherwise.
   */
  async function syncUserFromSession(): Promise<boolean> {
    // Skip if user just logged out
    if (justLoggedOutRef.current) {
      console.log("[AuthContext] Skipping sync - user just logged out");
      return false;
    }

    try {
      const { getCurrentUser, fetchAuthSession, fetchUserAttributes, signOut } =
        await import("aws-amplify/auth");

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken?.toString();

      if (currentUser && idToken) {
        let email = currentUser.signInDetails?.loginId;
        let displayName = "User";

        try {
          const attributes = await fetchUserAttributes();
          displayName =
            attributes.name ||
            attributes.given_name ||
            attributes.email?.split("@")[0] ||
            "User";

          // Use attribute email if available and not set by sign in details
          if (!email && attributes.email) {
            email = attributes.email;
          }
        } catch (err: any) {
          console.log("[AuthContext] Failed to fetch attributes:", err);

          // If token is revoked, sign out and return false
          if (err?.name === "NotAuthorizedException" ||
            err?.message?.includes("revoked") ||
            err?.message?.includes("expired")) {
            console.log("[AuthContext] Token revoked/expired, signing out...");
            try {
              await signOut({ global: false });
            } catch (_) { }
            return false;
          }
        }

        // Don't proceed with unknown email - this indicates invalid session
        if (!email || email === "unknown") {
          console.log("[AuthContext] No valid email found, session invalid");
          try {
            await signOut({ global: false });
          } catch (_) { }
          return false;
        }

        // 1. Role Logic
        const role = email === "henrywang3510@gmail.com" ? "SAFEWALKER" : "STUDENT";

        // 2. Log User Details (User Request)
        console.log(`[Auth] Logged in: ${email} | Role: ${role}`);

        const userData: User = {
          id: currentUser.userId,
          email,
          role,
          name: displayName,
        };
        setToken(idToken);
        setUser(userData);
        setAuthToken(idToken);

        // 3. Register if Safewalker & Start Heartbeat
        if (role === "SAFEWALKER") {
          // We do this async without blocking the UI immediately, or we could await.
          // Since syncUserFromSession returns boolean, we'll let it run.
          (async () => {
            try {
              const { lat, long } = await getDeviceInfoForRegistration();
              await registerSafewalker({
                name: userData.name,
                sid: userData.id,
                label: "",
                lat,
                long
              });
              console.log("[Auth] Safewalker registered successfully");
            } catch (e) {
              console.warn("[Auth] Safewalker registration failed:", e);
            }

            await startStatusHeartbeat({
              sid: userData.id,
              isStudent: false,
              getIsActiveRequest: () => true,
              intervalMs: 5000,
              label: "",
            });
          })();
        } else {
          // Student also needs heartbeat if they have active request? 
          // Actually endpoints.ts logic started it for both.
          // For student, we usually start it when there is an active request?
          // But let's match previous logic:
          startStatusHeartbeat({
            sid: userData.id,
            isStudent: true,
            getIsActiveRequest: () => false, // Student default not active
            intervalMs: 5000,
            label: "",
          });
        }

        return true;
      }
    } catch (e) {
      console.log("[AuthContext] No active session or sync failed");
    }
    return false;
  }

  async function signInWithGoogle() {
    // Reset logout flag since user explicitly wants to sign in
    justLoggedOutRef.current = false;

    try {
      const { signInWithRedirect, signOut } = await import("aws-amplify/auth");
      try {
        await signInWithRedirect({ provider: "Google" });
      } catch (err: any) {
        // Handle "Already signed in" by syncing session
        if (
          err.name === "UserAlreadyAuthenticatedException" ||
          err.message?.includes("already signed in")
        ) {
          console.log(
            "[AuthContext] User already signed in. Syncing session..."
          );
          const success = await syncUserFromSession();
          if (!success) {
            // State is messed up (Amplify says yes, but we can't get session). Force signout.
            console.log(
              "[AuthContext] Stale session detected. Forcing signout..."
            );
            try {
              await signOut({ global: false });
            } catch (_) { }
            // Don't auto-redirect here - let user click login again
            console.log("[AuthContext] Signed out stale session. User can try again.");
          }
        } else {
          throw err;
        }
      }
    } catch (e) {
      console.error("[AuthContext] Google Login failed", e);
      throw e;
    }
  }

  // Check for existing session on mount
  React.useEffect(() => {
    let hubRemove: (() => void) | undefined;
    let linkingSubscription: { remove: () => void } | undefined;
    let isMounted = true;

    const listener = (data: any) => {
      if (
        data.payload.event === "signIn" ||
        data.payload.event === "signedIn"
      ) {
        console.log("[AuthContext] Hub detected signIn/signedIn");
        // Only sync if not coming from a logout
        if (!justLoggedOutRef.current) {
          syncUserFromSession();
        } else {
          console.log("[AuthContext] Ignoring signIn event - user just logged out");
        }
      }
      if (data.payload.event === "signOut") {
        console.log("[AuthContext] Hub detected signOut");
        // Clear state on signout
        setToken(null);
        setUser(null);
        setActiveRequest(null);
        setAuthToken(null);
      }
    };

    async function setup() {
      // Check if we're coming from a signedout redirect
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl?.includes("signedout")) {
        console.log("[AuthContext] Detected signedout redirect, skipping auto-sync");
        justLoggedOutRef.current = true;
        // Reset the flag after a short delay so future logins work
        setTimeout(() => {
          justLoggedOutRef.current = false;
        }, 2000);
        return; // Don't sync session on signedout redirect
      }

      // Only sync if not just logged out
      if (!justLoggedOutRef.current) {
        await syncUserFromSession();
      }
      if (!isMounted) return;

      const { Hub } = await import("aws-amplify/utils");
      if (!isMounted) return;

      console.log("[AuthContext] Setting up Hub listener");
      hubRemove = Hub.listen("auth", listener);

      // Listen for deep link events (for logout redirect)
      linkingSubscription = Linking.addEventListener("url", (event) => {
        if (event.url?.includes("signedout")) {
          console.log("[AuthContext] Received signedout deep link");
          justLoggedOutRef.current = true;
          setToken(null);
          setUser(null);
          setActiveRequest(null);
          setAuthToken(null);
          // Reset after delay
          setTimeout(() => {
            justLoggedOutRef.current = false;
          }, 2000);
        }
      });
    }

    setup();

    return () => {
      isMounted = false;
      hubRemove?.();
      linkingSubscription?.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      login: (t, u) => {
        setToken(t);
        setUser(u);
        setAuthToken(t);
      },
      signInWithGoogle,
      logout: async () => {
        // Set flag to prevent auto-re-authentication during signout redirect
        justLoggedOutRef.current = true;

        // Clear local state
        setToken(null);
        setUser(null);
        setActiveRequest(null);
        setAuthToken(null);

        if (user?.role === "SAFEWALKER") {
          stopStatusHeartbeat();
          API.deregisterSafewalker(user.id);
        }

        try {
          // Clear Amplify's stored OAuth/auth state from AsyncStorage
          // This prevents Amplify from trying to resume pending OAuth flows
          const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
          const allKeys = await AsyncStorage.getAllKeys();
          const authKeys = allKeys.filter(key =>
            key.includes("CognitoIdentityServiceProvider") ||
            key.includes("amplify") ||
            key.includes("oauth") ||
            key.includes("auth")
          );
          if (authKeys.length > 0) {
            await AsyncStorage.multiRemove(authKeys);
            console.log("[Auth] Cleared stored auth keys:", authKeys);
          }
        } catch (e) {
          console.log("[Auth] Failed to clear stored auth state:", e);
        }

        // Use local signout only (global: false) to avoid Cognito hosted UI redirect
        // which can trigger OAuth callback handling and auto-re-authentication
        import("aws-amplify/auth").then(({ signOut }) => {
          signOut({ global: false }).catch(err => console.log("[Auth] SignOut error", err));
        });
      },

      activeRequest,
      setActiveRequest,
    }),
    [user, token, activeRequest]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
