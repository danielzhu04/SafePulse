import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import StudentHomeScreen from "../screens/student/StudentHomeScreen";
import StudentRequestScreen from "../screens/student/StudentRequestScreen";
import StudentStatusScreen from "../screens/student/StudentStatusScreen";

export type StudentStackParamList = {
  StudentHome: undefined;
  StudentRequest: undefined;
  StudentStatus: { requestId: string; code?: string };
};

const Stack = createNativeStackNavigator();

const COLORS = {
  header: "#0B1C2D",
  text: "#FFFFFF",
  yellow: "#F4C430",
};

export default function StudentStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.header },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: "800" },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="StudentHome"
        component={StudentHomeScreen}
        options={{
          title: "Home",
        }}
      />

      <Stack.Screen
        name="StudentRequest"
        component={StudentRequestScreen}
        options={{ title: "Request Safewalk" }}
      />

      <Stack.Screen
        name="StudentStatus"
        component={StudentStatusScreen}
        options={{ title: "Live Status" }}
      />
    </Stack.Navigator>
  );
}
