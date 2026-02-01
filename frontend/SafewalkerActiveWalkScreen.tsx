import React, { useEffect, useState } from "react";
import { Alert, Pressable, Text, TextInput, View, ActivityIndicator, Keyboard, TouchableWithoutFeedback, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { usePreventRemove } from "@react-navigation/native";
import { SafewalkerStackParamList } from "../../navigation/SafewalkerStack";
import { API } from "../../api/endpoints";
import * as Location from "expo-location";

type Props = NativeStackScreenProps<SafewalkerStackParamList, "SafewalkerActiveWalk">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  success: "#10B981",
  inputBg: "#0B1C2D",
};

export default function SafewalkerActiveWalkScreen({ route, navigation }: Props) {
  const { requestId, studentLat, studentLng } = route.params;

  // Local state to track the walk status
  const [activeState, setActiveState] = useState<{
    status: "ASSIGNED" | "WALKING" | "COMPLETED";
    studentLocation: { lat: number; lng: number } | null;
  } | null>(null);

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const isEnding = React.useRef(false);

  // Poll for status
  useEffect(() => {
    let active = true;

    async function fetchStatus() {
      try {
        // Get current location for heartbeat
        let lat = 0;
        let lng = 0;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } catch { }

        // Poll as Safewalker (isStudent=false)
        const res = await API.statusUpdate({
          sid: requestId, // user.id
          isStudent: false,
          isActiveRequest: true,
          lat,
          lng
        });

        if (!active) return;

        // If not assigned anymore, it implies cancellation or completion
        if (!res.is_assigned) {
          if (isEnding.current) return;
          isEnding.current = true;

          setActiveState({ status: "COMPLETED", studentLocation: null });
          Alert.alert("Info", "The request has ended.", [
            { text: "OK", onPress: () => navigation.replace("SafewalkerHome") }
          ]);
          return;
        }

        const status = res.matching_status ? "WALKING" : "ASSIGNED";

        setActiveState({
          status,
          studentLocation: (res.student_lat && res.student_lng) ? { lat: res.student_lat, lng: res.student_lng } : null
        });

      } catch (e) {
        console.error("Polling error", e);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [requestId, navigation]);

  // Prevent back navigation
  const shouldPreventRemove = activeState?.status === "ASSIGNED" || activeState?.status === "WALKING";
  usePreventRemove(shouldPreventRemove, ({ data }) => {
    const isWalking = activeState?.status === "WALKING";
    Alert.alert(
      isWalking ? "Cannot Leave Walk" : "Decline Request?",
      isWalking
        ? "You must complete the SafeWalk before leaving. Only the student can mark it as complete."
        : "Going back will return this request to the pool for other safewalkers.",
      isWalking
        ? [{ text: "OK", style: "cancel" }]
        : [
          { text: "Stay", style: "cancel" },
          {
            text: "Decline & Go Back", style: "destructive", onPress: async () => {
              try { await API.declineSafewalkerRequest(requestId); navigation.dispatch(data.action); } catch { }
            }
          }
        ]
    );
  });

  const handleVerify = async () => {
    if (code.length < 4) return;
    setVerifying(true);
    try {
      await API.verifySafewalkerCode(requestId, code);
      Alert.alert("Verified!", "Start walking.");
    } catch (e) { Alert.alert("Error", "Incorrect code."); }
    finally { setVerifying(false); }
  };

  const handleDecline = async () => {
    try {
      await API.declineSafewalkerRequest(requestId);
      navigation.replace("SafewalkerHome");
    } catch (e) { console.warn(e); }
  };

  if (!activeState) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={COLORS.yellow} />
        <Text style={{ color: COLORS.muted, marginTop: 10 }}>Loading mission...</Text>
      </View>
    );
  }

  const isWalking = activeState.status === "WALKING";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            initialRegion={{
              latitude: studentLat || 41.8268,
              longitude: studentLng || -71.4025,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
          >
            {/* Student Marker */}
            {activeState.studentLocation && (
              <Marker
                coordinate={{ latitude: activeState.studentLocation.lat, longitude: activeState.studentLocation.lng }}
                title="Student"
                pinColor="cyan"
              />
            )}
          </MapView>

          {/* Overlay Card */}
          <View style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            backgroundColor: COLORS.card,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            borderTopWidth: 1,
            borderColor: COLORS.border,
          }}>

            <Text style={{ color: COLORS.yellow, fontWeight: "bold", marginBottom: 8 }}>
              STATUS: {activeState.status}
            </Text>

            {!isWalking ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "bold" }}>
                  Meet the Student
                </Text>
                <Text style={{ color: COLORS.muted }}>
                  Go to the pickup location. When you meet, ask for their Safe Code.
                </Text>

                <TextInput
                  placeholder="Enter 4-digit Code"
                  placeholderTextColor={COLORS.muted}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    Keyboard.dismiss();
                    if (code.length === 4) handleVerify();
                  }}
                  blurOnSubmit={true}
                  style={{
                    backgroundColor: COLORS.inputBg,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    padding: 16,
                    color: COLORS.text,
                    fontSize: 20,
                    textAlign: "center",
                    letterSpacing: 4,
                    fontWeight: "bold"
                  }}
                />

                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    handleVerify();
                  }}
                  disabled={verifying}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    opacity: verifying ? 0.7 : 1
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "900", color: "#0B1C2D" }}>
                    {verifying ? "Verifying..." : "Verify & Start Walk"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleDecline}
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
                    Decline Request
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: COLORS.success, fontSize: 20, fontWeight: "bold" }}>
                  SafeWalk in Progress
                </Text>
                <Text style={{ color: COLORS.muted }}>
                  Escort the student to their destination.
                </Text>
                <Text style={{ color: COLORS.muted, fontSize: 12, fontStyle: "italic" }}>
                  Only the student can mark the walk as complete.
                </Text>
              </View>
            )}

          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
