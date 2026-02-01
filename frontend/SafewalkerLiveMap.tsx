import React, { useMemo } from "react";
import { View } from "react-native";
import MapView, {
  Marker,
  Polygon,
  PROVIDER_DEFAULT,
  Region,
} from "react-native-maps";

type Props = {
  safewalker: { lat: number; lng: number };
  headingDegrees?: number | null;
  pickup?: { lat: number; lng: number } | null;
};

const MAP_BLUE = "#1E90FF";
const MAP_BLUE_LIGHT = "rgba(30, 144, 255, 0.25)";

function degToRad(d: number) {
  return (d * Math.PI) / 180;
}

function buildHeadingCone(
  lat: number,
  lng: number,
  headingDeg: number,
  lengthMeters = 35,
  spreadDeg = 45,
  steps = 16
) {
  const metersToLat = 1 / 111_111;
  const metersToLng = 1 / (111_111 * Math.cos(degToRad(lat)));

  const points = [{ latitude: lat, longitude: lng }];

  const start = headingDeg - spreadDeg / 2;
  const end = headingDeg + spreadDeg / 2;

  for (let i = 0; i <= steps; i++) {
    const angle = degToRad(start + (i / steps) * spreadDeg);
    points.push({
      latitude: lat + Math.cos(angle) * lengthMeters * metersToLat,
      longitude: lng + Math.sin(angle) * lengthMeters * metersToLng,
    });
  }

  return points;
}

export default function SafewalkerLiveMap({
  safewalker,
  headingDegrees,
  pickup,
}: Props) {
  const region: Region = useMemo(
    () => ({
      latitude: safewalker.lat,
      longitude: safewalker.lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }),
    [safewalker.lat, safewalker.lng]
  );

  const cone = useMemo(() => {
    if (headingDegrees == null) return null;
    return buildHeadingCone(safewalker.lat, safewalker.lng, headingDegrees);
  }, [safewalker.lat, safewalker.lng, headingDegrees]);

  return (
    <View
      style={{
        height: 260,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1,
      }}
    >
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {pickup?.lat != null && pickup?.lng != null && (
          <Marker
            coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
            title="Pickup"
          />
        )}

        {/* {cone && (
          <Polygon
            coordinates={cone}
            strokeWidth={0}
            fillColor={MAP_BLUE_LIGHT}
          />
        )} */}

        <Marker
          coordinate={{ latitude: safewalker.lat, longitude: safewalker.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: MAP_BLUE,
              }}
            />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}
