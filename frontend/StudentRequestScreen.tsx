import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import MapView, { Marker, Region } from "react-native-maps";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StudentStackParamList } from "../../navigation/StudentStack";
import { API } from "../../api/endpoints";
import { usePushToken } from "../../hooks/usePushToken";

const CAMPUS_SPOTS = [
  "Thayer St",
  "Main Green",
  "SciLi",
  "Ratty",
  "Andrews Hall",
  "Grad Center",
  "Waterman St",
];

type Props = NativeStackScreenProps<StudentStackParamList, "StudentRequest">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
  yellowDark: "#D9A800",
  inputBg: "#0B1C2D",
};

export default function StudentRequestScreen({ navigation }: Props) {
  const pushToken = usePushToken();

  // Pickup
  const [pickupCoords, setPickupCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pickupLabel, setPickupLabel] = useState("Current Location"); // label only
  const [loadingLoc, setLoadingLoc] = useState(false);

  // Destination
  const [destCoords, setDestCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [destChoice, setDestChoice] = useState(CAMPUS_SPOTS[0]);
  const [destCustom, setDestCustom] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const mapRegion: Region = useMemo(() => {
    // Center map on destination if chosen; else on pickup if available; else Brown default
    const lat = destCoords?.lat ?? pickupCoords?.lat ?? 41.8268;
    const lng = destCoords?.lng ?? pickupCoords?.lng ?? -71.4025;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [destCoords, pickupCoords]);

  async function getCurrentLocation(): Promise<{ lat: number; lng: number } | null> {
    setLoadingLoc(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Location needed", "Enable location to request Safewalk.");
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setPickupCoords(coords);
      // Keep label user-editable; default to "Current Location"
      if (!pickupLabel.trim().length) setPickupLabel("Current Location");
      return coords;
    } catch {
      Alert.alert("Location error", "Could not fetch location.");
      return null;
    } finally {
      setLoadingLoc(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    try {
      // Ensure pickup coords exist (from GPS)
      let coords = pickupCoords;
      if (!coords) {
        coords = await getCurrentLocation();
      }

      if (!coords) {
        throw new Error("Pickup location is required.");
      }

      if (!destCoords) {
        throw new Error("Please tap the map to select a destination.");
      }

      const destinationLabel = destCustom.trim().length
        ? destCustom.trim()
        : destChoice;
      const pickupLabelFinal = pickupLabel.trim().length
        ? pickupLabel.trim()
        : "Current Location";

      const res = await API.createStudentRequest({
        pickup: {
          label: pickupLabelFinal,
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
        },
        destination: {
          label: destinationLabel,
          lat: destCoords.lat,
          lng: destCoords.lng,
        },
        expoPushToken: pushToken,
      });

      navigation.replace("StudentStatus", {
        requestId: res.requestId,
        code: res.code,
      });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Pickup card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "900" }}>
            Pickup
          </Text>

          <Text style={{ color: COLORS.muted, fontSize: 13 }}>
            Use your current location, or label it (e.g., “Front of SciLi”).
          </Text>

          <TextInput
            placeholder="Pickup label (optional)"
            placeholderTextColor={COLORS.muted}
            value={pickupLabel}
            onChangeText={setPickupLabel}
            style={{
              backgroundColor: COLORS.inputBg,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 12,
              padding: 12,
              color: COLORS.text,
            }}
          />

          <Pressable
            onPress={async () => await getCurrentLocation()}
            disabled={loadingLoc}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
              paddingVertical: 12,
              borderRadius: 14,
              alignItems: "center",
              opacity: loadingLoc ? 0.7 : 1,
              marginTop: 2,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#0B1C2D" }}>
              {loadingLoc
                ? "Getting location…"
                : pickupCoords
                  ? "Update Current Location"
                  : "Use Current Location"}
            </Text>
          </Pressable>
        </View>

        {/* Destination card */}
        <View
          style={{
            backgroundColor: COLORS.card,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 18,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: "900" }}>
            Destination
          </Text>

          <Text style={{ color: COLORS.muted, fontSize: 13 }}>
            Tap the map to drop a destination pin.
          </Text>

          <View
            style={{
              height: 240,
              borderRadius: 14,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <MapView
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              region={mapRegion}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setDestCoords({ lat: latitude, lng: longitude });
              }}
              showsUserLocation={false}
              showsMyLocationButton={false}
            >
              {destCoords && (
                <Marker
                  coordinate={{
                    latitude: destCoords.lat,
                    longitude: destCoords.lng,
                  }}
                  title="Destination"
                  pinColor={COLORS.yellow}
                />
              )}
            </MapView>
          </View>

          <Text style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>
            Or custom label
          </Text>
          <TextInput
            placeholder="e.g., 75 Waterman St"
            placeholderTextColor={COLORS.muted}
            value={destCustom}
            onChangeText={setDestCustom}
            style={{
              backgroundColor: COLORS.inputBg,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 12,
              padding: 12,
              color: COLORS.text,
            }}
          />

          {destCoords && (
            <Text style={{ color: COLORS.muted, fontSize: 12 }}>
              Destination coords: {destCoords.lat.toFixed(5)},{" "}
              {destCoords.lng.toFixed(5)}
            </Text>
          )}
        </View>

        {/* Submit */}
        <Pressable
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => ({
            backgroundColor: pressed ? COLORS.yellowDark : COLORS.yellow,
            paddingVertical: 14,
            borderRadius: 16,
            alignItems: "center",
            opacity: submitting ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: "900", color: "#0B1C2D" }}>
            {submitting ? "Submitting…" : "Submit Request"}
          </Text>
        </Pressable>

        <View style={{ height: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
