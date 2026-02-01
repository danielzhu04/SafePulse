import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudentStackParamList } from "../../navigation/StudentStack";
import { useAuth } from "../../auth/AuthContext";

type Props = NativeStackScreenProps<StudentStackParamList, "StudentHome">;

import { COLORS } from "../../theme/colors";


function PrimaryButton({
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
        backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: "#0B1C2D" }}>
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
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function StudentHomeScreen({ navigation }: Props) {
  const { user, logout, activeRequest } = useAuth();
  const name = user?.name ?? "there";
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ flex: 1, padding: 16, gap: 14 }}>
        {/* Header */}
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: COLORS.text }}>
            SafePulse
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.muted }}>
            Walk safer, together.
          </Text>
        </View>

        {/* Greeting card */}
        <View
          style={{
            marginTop: 10,
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 16,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                backgroundColor: "rgba(244, 196, 48, 0.18)",
                borderColor: "rgba(244, 196, 48, 0.40)",
                borderWidth: 1,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: COLORS.yellow,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                STUDENT MODE
              </Text>
            </View>

            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.blue,
                opacity: 0.9,
              }}
            />
            <Text style={{ color: COLORS.muted, fontSize: 13 }}>
              Ready to request
            </Text>
          </View>

          <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text }}>
            Hi {name}
          </Text>

          <Text style={{ fontSize: 15, color: COLORS.muted, lineHeight: 20 }}>
            Request a Safewalk in one tap. We’ll match you with the closest
            available safewalker and show live status updates.
          </Text>

          <View style={{ gap: 10, marginTop: 10 }}>
            <PrimaryButton
              title="Request Safewalk"
              onPress={() => navigation.navigate("StudentRequest")}
            />
            <SecondaryButton title="Logout" onPress={logout} />
          </View>
        </View>
        {activeRequest && (
          <Pressable
            onPress={() =>
              navigation.navigate("StudentStatus", {
                requestId: activeRequest.requestId,
              })
            }
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor:
                activeRequest.status === "ASSIGNED"
                  ? "rgba(244, 196, 48, 0.55)"
                  : COLORS.border,
              backgroundColor:
                activeRequest.status === "ASSIGNED"
                  ? "rgba(244, 196, 48, 0.10)"
                  : pressed
                    ? "#162133"
                    : "transparent",
              padding: 14,
              borderRadius: 16,
              gap: 8,
            })}
          >
            <Text
              style={{ color: COLORS.text, fontWeight: "900", fontSize: 14 }}
            >
              {activeRequest.status === "ASSIGNED"
                ? "Active Safewalk (Matched)"
                : "Active Safewalk (Matching)"}
            </Text>

            {activeRequest.status === "ASSIGNED" && (
              <View style={{ flexDirection: "row", gap: 16 }}>
                <View style={{ gap: 2 }}>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>ETA</Text>
                  <Text style={{ color: COLORS.text, fontWeight: "900" }}>
                    {activeRequest.etaSeconds != null
                      ? `${Math.ceil(activeRequest.etaSeconds / 60)} min`
                      : "—"}
                  </Text>
                </View>

                {activeRequest.studentCode ? (
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                      Your code
                    </Text>
                    <Text style={{ color: COLORS.yellow, fontWeight: "900" }}>
                      {activeRequest.studentCode}
                    </Text>
                  </View>
                ) : null}

                {activeRequest.safewalkerCode ? (
                  <View style={{ gap: 2 }}>
                    <Text style={{ color: COLORS.muted, fontSize: 12 }}>
                      SafeWalker shows
                    </Text>
                    <Text style={{ color: COLORS.text, fontWeight: "900" }}>
                      {activeRequest.safewalkerCode}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={{ color: COLORS.muted, fontSize: 12 }}>
              Tap to view live status
            </Text>
          </Pressable>
        )}

        {/* Bottom helper */}
        <View style={{ marginTop: "auto", paddingTop: 10 }}>
          <Text style={{ color: COLORS.muted, fontSize: 12, lineHeight: 16 }}>
            Tip: If you’re meeting a volunteer, confirm the safety code before
            starting the walk.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
