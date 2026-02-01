import React from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import LoginScreen from "../screens/auth/LoginScreen";
import StudentStack from "./StudentStack";
import SafewalkerStack from "./SafewalkerStack";

// Theme colors (Night Safety + Safewalk Yellow)
const COLORS = {
  bg: "#0F172A", // deep navy
  header: "#0B1C2D", // darker navy
  text: "#FFFFFF",
  yellow: "#F4C430",
};

const Root = createNativeStackNavigator();

// Optional: also theme the NavigationContainer background
const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
  },
};

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer theme={NavTheme}>
      <Root.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.header,
          },
          headerTintColor: COLORS.text,
          headerTitleStyle: {
            fontWeight: "800",
            fontSize: 18,
          },
          headerShadowVisible: false, // clean, modern
          headerBackTitle: "", // hide back button text
        }}
      >
        {!user ? (
          <Root.Screen
            name="Login"
            component={LoginScreen}
            options={{
              headerShown: false, // login is full-screen
            }}
          />
        ) : user.role === "STUDENT" ? (
          <Root.Screen
            name="Student"
            component={StudentStack}
            options={{
              headerShown: false, // StudentStack will control its own headers
            }}
          />
        ) : (
          <Root.Screen
            name="SafeWalker"
            component={SafewalkerStack}
            options={{
              headerShown: false, // SafewalkerStack controls headers
            }}
          />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
