// mobile/app/(auth)/_layout.tsx
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../src/contexts/AuthContext";

export default function AuthLayout() {
  const { isSignedIn, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Jika sudah login, langsung ke tabs (ghost-mode sebagai halaman utama)
  if (isSignedIn) {
    return <Redirect href="/(tabs)/ghost-mode" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
        }}
      />
    </Stack>
  );
}
