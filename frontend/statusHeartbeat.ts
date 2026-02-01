import * as Location from "expo-location";
import { API } from "../api/endpoints";
import { StatusUpdateResponse } from "./types";

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let inFlight = false;

export type HeartbeatState = StatusUpdateResponse & {
  sid: string;
  isStudent: boolean;
  isActiveRequest: boolean;
  lastSentAt: number;
};

let latest: HeartbeatState | null = null;
const listeners = new Set<(data: HeartbeatState) => void>();

export function getLatestHeartbeat() {
  return latest;
}

export function subscribeHeartbeat(cb: (data: HeartbeatState) => void) {
  listeners.add(cb);
  if (latest) cb(latest);
  return () => listeners.delete(cb);
}

function publish(next: HeartbeatState) {
  latest = next;
  for (const cb of listeners) cb(next);
}

// isActiveRequest can change while app runs, so pass a function.
export async function startStatusHeartbeat(opts: {
  sid: string;
  isStudent: boolean;
  getIsActiveRequest: () => boolean;
  intervalMs?: number;
  label?: string; // blank ok
}) {
  if (running) return;
  running = true;

  const intervalMs = opts.intervalMs ?? 5000;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    running = false;
    throw new Error("Location permission not granted");
  }

  const tick = async () => {
    if (!running || inFlight) return;
    inFlight = true;

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await API.statusUpdate({
        sid: opts.sid,
        isStudent: opts.isStudent,
        isActiveRequest: opts.getIsActiveRequest(),
        label: opts.label ?? "",
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });

      publish({
        ...res,
        sid: opts.sid,
        isStudent: opts.isStudent,
        isActiveRequest: opts.getIsActiveRequest(),
        lastSentAt: Date.now(),
      });
    } catch {
      // ignore; retry next tick
    } finally {
      inFlight = false;
    }
  };

  await tick();
  timer = setInterval(tick, intervalMs);
}

export function stopStatusHeartbeat() {
  running = false;
  inFlight = false;

  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  latest = null;
  listeners.clear();
}
