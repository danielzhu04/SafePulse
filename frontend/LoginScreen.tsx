import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// API removed
import { useAuth } from "../../auth/AuthContext";

// Theme tokens (Night Safety + Safewalk Yellow)
const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
};

export default function LoginScreen() {
  const { login, signInWithGoogle } = useAuth();

  const [loading, setLoading] = useState(false);



  async function onGoogleLogin() {
    try {
      setLoading(true);
      await signInWithGoogle();
      // Note: signInWithGoogle handles redirects, so we might not reach here immediately
      // or at all if redirect happens fast. 
    } catch (e: any) {
      Alert.alert("Google Login failed", e.message ?? String(e));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 16 }}>
        {/* Brand */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 34, fontWeight: "900", color: COLORS.text }}>
            SafePulse
          </Text>
          <Text
            style={{ fontSize: 15, color: COLORS.muted, textAlign: "center" }}
          >
            Campus Safewalk, redesigned for scale
          </Text>
        </View>

        {/* Login card */}
        <View
          style={{
            backgroundColor: COLORS.yellow,
            borderWidth: 1,
            borderColor: COLORS.yellow,
            borderRadius: 18,
            padding: 16,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.bg }}>
            Sign in
          </Text>

          <Pressable
            onPress={onGoogleLogin}
            disabled={loading}
            style={({ pressed }) => ({
              backgroundColor: "white", // Google White
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              marginTop: 8,
              opacity: loading ? 0.7 : 1,
              flexDirection: "row",
              justifyContent: "center",
              gap: 10
            })}
          >
            <Image
              source={require('../../../assets/google-logo.png')}
              style={{ width: 20, height: 20 }}
            />
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                color: "black",
              }}
            >
              Sign in with Google
            </Text>
          </Pressable>


        </View>

        {/* Footer */}
        <Text
          style={{
            color: COLORS.muted,
            fontSize: 11,
            textAlign: "center",
          }}
        >
          Built for campus safety • Scales to hundreds of concurrent requests
        </Text>
      </View>
    </SafeAreaView>
  );
}
