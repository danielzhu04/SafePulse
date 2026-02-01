import React from "react";
import { Amplify } from "aws-amplify";
// @ts-ignore
import awsconfig from "./src/aws-exports";

Amplify.configure(awsconfig);

import { AuthProvider } from "./src/auth/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
