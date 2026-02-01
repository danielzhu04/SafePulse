import React, { useCallback, useRef, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafewalkerStackParamList } from "../../navigation/SafewalkerStack";
import { API } from "../../api/endpoints";
import { SafewalkerRequestListItem } from "../../api/types";
import {
  getLatestHeartbeat,
  subscribeHeartbeat,
} from "../../api/statusHeartbeat";

type Props = NativeStackScreenProps<SafewalkerStackParamList, "SafewalkerList">;

const COLORS = {
  bg: "#0F172A",
  card: "#1E293B",
  border: "#334155",
  text: "#FFFFFF",
  muted: "#94A3B8",
  yellow: "#F4C430",
};

export default function SafewalkerRequestListScreen({ navigation }: Props) {
  const [requests, setRequests] = useState<SafewalkerRequestListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [waiting, setWaiting] = useState(true);

  // Prevent spamming list endpoint when heartbeat keeps saying "true"
  const fetchedForThisMatchRef = useRef(false);

  const fetchRequestsSnapshot = async () => {
    const data = await API.listSafewalkerRequests();
    setRequests(data);
    setWaiting(data.length === 0);
  };

  // When matching_status flips true -> fetch cards once.
  const handleMatchingStatus = useCallback(async (matching: boolean) => {
    if (!matching) {
      fetchedForThisMatchRef.current = false;
      setRequests([]);
      setWaiting(true);
      return;
    }

    // matching === true
    setWaiting(false);

    // only fetch once per "match session"
    if (fetchedForThisMatchRef.current) return;
    fetchedForThisMatchRef.current = true;

    try {
      const data = await API.listSafewalkerRequests();
      setRequests(data);
      setWaiting(data.length === 0);
      // if backend said matching=true but list is empty,
      // allow another fetch next tick
      if (data.length === 0) fetchedForThisMatchRef.current = false;
    } catch (e) {
      // if fetch failed, allow retry next tick
      fetchedForThisMatchRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // seed from latest heartbeat
      const latest = getLatestHeartbeat?.();
      if (latest) {
        // This screen is for safewalker; ignore student heartbeats
        if (!latest.isStudent) {
          handleMatchingStatus(latest.matching_status);
        } else {
          setRequests([]);
          setWaiting(true);
        }
      } else {
        setRequests([]);
        setWaiting(true);
      }

      // subscribe for live updates
      const unsub = subscribeHeartbeat((hb) => {
        // only react to safewalker heartbeat events
        if (hb.isStudent) return;

        handleMatchingStatus(hb.matching_status);
      });

      return () => unsub();
    }, [handleMatchingStatus])
  );

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      fetchedForThisMatchRef.current = false; // allow re-fetch
      await fetchRequestsSnapshot();
      setWaiting(requests.length === 0);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.requestId}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.yellow}
          />
        }
        ListEmptyComponent={
          <View style={{ marginTop: 50, alignItems: "center" }}>
            <Text style={{ color: COLORS.muted }}>
              {waiting ? "Waiting for a match..." : "No active requests found."}
            </Text>
            {waiting && (
              <Text style={{ color: COLORS.muted, marginTop: 8, fontSize: 12 }}>
                Keep the app open — you’ll be assigned automatically.
              </Text>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("SafewalkerActiveWalk", {
                requestId: item.requestId,
                studentLat: item.pickupLat,
                studentLng: item.pickupLng,
              })
            }
            style={({ pressed }) => ({
              backgroundColor: COLORS.card,
              padding: 16,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{ color: COLORS.text, fontWeight: "bold", fontSize: 16 }}
              >
                {item.studentName}
              </Text>
              <Text style={{ color: COLORS.yellow, fontSize: 12 }}>
                MATCH FOUND
              </Text>
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                📍 From:{" "}
                <Text style={{ color: COLORS.text }}>{item.pickupLabel}</Text>
              </Text>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                🏁 To:{" "}
                <Text style={{ color: COLORS.text }}>
                  {item.destinationLabel}
                </Text>
              </Text>
            </View>

            <Text
              style={{
                color: COLORS.muted,
                fontSize: 12,
                marginTop: 8,
                alignSelf: "flex-end",
              }}
            >
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
