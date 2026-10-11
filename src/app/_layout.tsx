import "@/global.css";

import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { useAuthStore } from "@/store/auth-store";

// El splash se queda hasta que sepamos si hay sesion, para no parpadear el login
// a quien ya tenia un token guardado.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (status !== "hydrating") void SplashScreen.hideAsync();
  }, [status]);

  if (status === "hydrating") return null;

  const isAuthenticated = status === "authenticated";

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Con el guard en false la ruta deja de existir y el router manda a la
            otra: no hace falta un redirect manual en cada pantalla. */}
        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="index" />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" options={{ animation: "fade" }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
