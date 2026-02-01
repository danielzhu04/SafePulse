import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export function usePushToken() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (existing !== "granted") {
        const res = await Notifications.requestPermissionsAsync();
        status = res.status;
      }
      if (status !== "granted") return;

      const t = await Notifications.getExpoPushTokenAsync();
      setToken(t.data);

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
        });
      }
    }
    run().catch(() => { });
  }, []);

  return token;
}
