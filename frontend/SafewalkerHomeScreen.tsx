import React, { useEffect, useState } from "react";
import { Pressable, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafewalkerStackParamList } from "../../navigation/SafewalkerStack";
import { useAuth } from "../../auth/AuthContext";
import { API } from "../../api/endpoints";
import * as Location from "expo-location";

type Props = NativeStackScreenProps<SafewalkerStackParamList, "SafewalkerHome">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  red: "#EF4444",
};

export default function SafewalkerHomeScreen({ navigation }: Props) {
  const { logout, user } = useAuth();
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      if (!user?.id) return;

      try {
        let lat = 0;
        let lng = 0;
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          lat = loc.coords.latitude;
          lng = loc.coords.longitude;
        } catch { }

        const res = await API.statusUpdate({
          sid: user.id,
          isStudent: false,
          isActiveRequest: true, // "I am available"
          lat,
          lng
        });


        if (res.success && res.is_assigned) {
          clearInterval(intervalId);
          navigation.replace("SafewalkerActiveWalk", {
            requestId: user.id,
            studentLat: res.student_lat ?? 0,
            studentLng: res.student_lng ?? 0
          });
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }
    };

    intervalId = setInterval(pollStatus, 3000); // Poll every 3s
    return () => clearInterval(intervalId);
  }, [user, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome,</Text>
        <Text style={styles.subtitle}>SafeWalker</Text>
        <Text style={styles.status}>You are online and available.</Text>

        <View style={styles.card}>
          <ActivityIndicator size="large" color={COLORS.yellow} />
          <Text style={styles.cardTitle}>Waiting for Requests...</Text>
          <Text style={styles.cardText}>
            We'll notify you when a student nearby needs a walk.
          </Text>
        </View>

        <View style={{ marginTop: "auto" }}>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log Out</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, padding: 20, gap: 10 },
  title: { color: COLORS.text, fontSize: 32, fontWeight: "900" },
  subtitle: { color: COLORS.yellow, fontSize: 32, fontWeight: "900" },
  status: { color: COLORS.muted, fontSize: 16, marginBottom: 20 },
  card: {
    backgroundColor: COLORS.card,
    padding: 30,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    gap: 16,
  },
  cardTitle: { color: COLORS.text, fontSize: 20, fontWeight: "bold" },
  cardText: { color: COLORS.muted, textAlign: "center", fontSize: 16 },
  logoutButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  logoutText: { fontSize: 16, fontWeight: "700", color: COLORS.red }
});
