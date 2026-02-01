import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SafewalkerHomeScreen from "../screens/safewalker/SafewalkerHomeScreen";
import SafewalkerRequestListScreen from "../screens/safewalker/SafewalkerRequestListScreen";
import SafewalkerActiveWalkScreen from "../screens/safewalker/SafewalkerActiveWalkScreen";

export type SafewalkerStackParamList = {
  SafewalkerHome: undefined;
  SafewalkerActiveWalk: { requestId: string; studentLat: number; studentLng: number };
  SafewalkerList: undefined;
};

const Stack = createNativeStackNavigator<SafewalkerStackParamList>();

export default function SafewalkerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0B1C2D" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SafewalkerHome"
        component={SafewalkerHomeScreen}
        options={{ title: "SafeWalker" }}
      />
      <Stack.Screen
        name="SafewalkerList"
        component={SafewalkerRequestListScreen}
        options={{ title: "Requests" }}
      />

      <Stack.Screen
        name="SafewalkerActiveWalk"
        component={SafewalkerActiveWalkScreen}
        options={{ title: "Active Walk" }}
      />
    </Stack.Navigator>
  );
}
