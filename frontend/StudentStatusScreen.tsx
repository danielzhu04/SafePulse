import React, { useState, useCallback, useEffect } from "react";
import { Pressable, Text, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudentStackParamList } from "../../navigation/StudentStack";
import { API } from "../../api/endpoints";
import { usePolling } from "../../hooks/usePolling";
import type { StudentRequestStatusResponse } from "../../api/types";
import SafewalkerLiveMap from "../../components/SafewalkerLiveMap";
import { useAuth } from "../../auth/AuthContext";

type Props = NativeStackScreenProps<StudentStackParamList, "StudentStatus">;

import { COLORS } from "../../theme/colors";


function Pill({ status }: { status: string }) {
  const meta =
    status === "ASSIGNED"
      ? {
        label: "SAFEWALKER ON WAY",
        bg: "rgba(34,197,94,0.15)",
        fg: COLORS.green,
      }
      : status === "WALKING"
        ? {
          label: "SAFEWALK IN PROGRESS",
          bg: "rgba(34,197,94,0.3)",
          fg: COLORS.green,
        }
        : status === "MATCHING"
          ? { label: "MATCHING", bg: "rgba(30,144,255,0.15)", fg: COLORS.blue }
          : status === "NO_AVAILABLE"
            ? { label: "NO AVAILABLE", bg: "rgba(245,158,11,0.18)", fg: COLORS.amber }
            : status === "COMPLETED"
              ? { label: "COMPLETED", bg: "rgba(34,197,94,0.15)", fg: COLORS.green }
              : { label: "CANCELLED", bg: "rgba(148,163,184,0.15)", fg: COLORS.muted };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: meta.bg,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: meta.fg, fontWeight: "900", fontSize: 12 }}>
        {meta.label}
      </Text>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
  color = COLORS.yellow,
  textColor = "#0B1C2D",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: color,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: "center",
        opacity: disabled || pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 16, fontWeight: "900", color: textColor }}>
        {title}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: pressed ? "#475569" : COLORS.border,
        backgroundColor: pressed ? "#162133" : "transparent",
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
      })}
    >
      <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.text }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function StudentStatusScreen({ route, navigation }: Props) {
  const { requestId, code } = route.params;
  const [data, setData] = useState<StudentRequestStatusResponse | null>(null);
  const { setActiveRequest } = useAuth();

  // ✅ Ensure heartbeat sees an active request immediately
  useEffect(() => {
    setActiveRequest({ requestId, status: "MATCHING" });
    return () => {
      // If user navigates away unexpectedly, clear it (optional)
      // setActiveRequest(null);
    };
  }, [requestId, setActiveRequest]);

  const refresh = useCallback(async () => {
    try {
      const res = await API.getStudentRequestStatus(requestId);
      setData(res);

      if (res.status === "ASSIGNED" || res.status === "WALKING") {
        setActiveRequest({
          requestId,
          status: res.status, // keep real status
          etaSeconds: res.etaSeconds ?? null,
          studentCode: res.studentCode || code, // Fallback to route param
        });
      } else if (res.status === "MATCHING") {
        setActiveRequest({ requestId, status: "MATCHING" });
      } else {
        setActiveRequest(null);
      }
    } catch (e) {
      console.error("Refresh error", e);
    }
  }, [requestId, setActiveRequest]);

  usePolling(refresh, 2000, true);

  function cancel() {
    Alert.alert(
      "Cancel Safewalk request?",
      "You’ll lose your place in the queue.",
      [
        { text: "Keep waiting", style: "cancel" },
        {
          text: "Cancel request",
          style: "destructive",
          onPress: async () => {
            await API.cancelStudentRequest(requestId);
            setActiveRequest(null);
            navigation.popToTop();
          },
        },
      ]
    );
  }

  const handleComplete = async () => {
    Alert.alert("Complete SafeWalk?", "Confirm that you have arrived safely.", [
      { text: "Not yet", style: "cancel" },
      {
        text: "Yes, I'm safe",
        onPress: async () => {
          await API.completeStudentRequest(requestId);
          setActiveRequest(null); // ✅ important
          navigation.popToTop();
        },
      },
    ]);
  };

  const status = data?.status ?? "MATCHING";
  const etaText =
    data?.etaSeconds != null ? `${Math.ceil(data.etaSeconds / 60)} min` : "—";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* Header */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: COLORS.text }}>
            Live Status
          </Text>
          <Pill status={status} />
          <Text style={{ color: COLORS.muted, fontSize: 12 }}>
            ID: {requestId}
          </Text>
        </View>

        {/* Status card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 16,
            gap: 12,
            minHeight: 200,
          }}
        >
          {status === "MATCHING" && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                Matching…
              </Text>
              <Text style={{ color: COLORS.muted, lineHeight: 20 }}>
                Finding the closest safewalker.
              </Text>
            </>
          )}

          {status === "ASSIGNED" && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                SafeWalker Accepted ✅
              </Text>

              <View style={{ alignItems: "center", marginVertical: 10 }}>
                <Text
                  style={{
                    color: COLORS.muted,
                    fontSize: 12,
                    textTransform: "uppercase",
                  }}
                >
                  Show this code to safewalker
                </Text>
                <Text
                  style={{
                    color: COLORS.yellow,
                    fontSize: 48,
                    fontWeight: "900",
                    letterSpacing: 4,
                  }}
                >
                  {data?.studentCode || code || "----"}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ color: COLORS.muted }}>ETA</Text>
                <Text style={{ color: COLORS.text, fontWeight: "bold" }}>
                  {etaText}
                </Text>
              </View>

              {data?.safewalkerLive && (
                <View
                  style={{
                    height: 250,
                    borderRadius: 12,
                    overflow: "hidden",
                    marginTop: 10,
                  }}
                >
                  <SafewalkerLiveMap
                    safewalker={{
                      lat: data.safewalkerLive.lat,
                      lng: data.safewalkerLive.lng,
                    }}
                    headingDegrees={data.safewalkerHeadingDegrees ?? 0}
                    pickup={null}
                  />
                </View>
              )}
            </>
          )}

          {status === "WALKING" && (
            <>
              <Text
                style={{ color: COLORS.green, fontWeight: "900", fontSize: 22 }}
              >
                On the move 🚶
              </Text>
              <Text style={{ color: COLORS.text }}>
                Your Safewalk is in progress.
              </Text>
              <View style={{ alignItems: "center", padding: 20 }}>
                <Text style={{ fontSize: 60 }}>🛡️</Text>
              </View>
              <Text
                style={{
                  color: COLORS.muted,
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                When you arrive, press the button below to complete the walk.
              </Text>
            </>
          )}

          {status === "NO_AVAILABLE" && (
            <>
              <Text
                style={{ color: COLORS.text, fontWeight: "900", fontSize: 18 }}
              >
                No safewalkers right now
              </Text>
              <Text style={{ color: COLORS.muted }}>
                Please try again in a few minutes.
              </Text>
            </>
          )}

          {status === "COMPLETED" && (
            <Text
              style={{ color: COLORS.green, fontWeight: "900", fontSize: 18 }}
            >
              SafeWalk Completed!
            </Text>
          )}
        </View>

        {/* Actions */}
        <View style={{ marginTop: "auto", gap: 10 }}>
          {status === "WALKING" ? (
            <PrimaryButton
              title="Mark Safe / Complete"
              onPress={handleComplete}
              color={COLORS.green}
              textColor="#FFFFFF"
            />
          ) : status === "COMPLETED" || status === "CANCELLED" ? (
            <PrimaryButton
              title="Back to Home"
              onPress={() => navigation.popToTop()}
            />
          ) : (
            <SecondaryButton title="Cancel Request" onPress={cancel} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
