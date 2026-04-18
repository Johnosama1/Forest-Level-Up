import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PHONE_FRAME_CSS = `
  html, body {
    margin: 0;
    padding: 0;
    background: #07040f !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-height: 100vh !important;
    min-width: 100vw !important;
  }
  #root {
    position: relative !important;
    width: 390px !important;
    height: 844px !important;
    border-radius: 50px !important;
    overflow: hidden !important;
    box-shadow:
      0 0 0 3px #2e3270,
      0 0 0 14px #1a1c3e,
      0 0 0 16px #2e3270,
      0 35px 90px rgba(0,0,0,0.95),
      inset 0 0 0 1px rgba(255,255,255,0.05) !important;
    flex-shrink: 0 !important;
    transform-origin: center center !important;
  }
  /* Notch overlay on top of screen */
  #root::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 130px;
    height: 36px;
    background: #07040f;
    border-bottom-left-radius: 22px;
    border-bottom-right-radius: 22px;
    z-index: 99999;
    pointer-events: none;
  }
  /* Side buttons via pseudo-elements on body */
  body::before {
    content: '';
    position: fixed;
    background: #1e2050;
    border-radius: 3px;
    width: 4px;
    height: 80px;
    z-index: 999999;
    pointer-events: none;
  }
`;

function injectPhoneFrame() {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('phone-frame-css');
  if (existing) return;
  const style = document.createElement('style');
  style.id = 'phone-frame-css';
  style.textContent = PHONE_FRAME_CSS;
  document.head.appendChild(style);

  // Scale root to fit viewport
  function scaleRoot() {
    const root = document.getElementById('root');
    if (!root) return;
    const scaleH = (window.innerHeight - 20) / 844;
    const scaleW = (window.innerWidth - 60) / 390;
    const s = Math.min(scaleH, scaleW, 1);
    root.style.transform = `scale(${s})`;
  }
  scaleRoot();
  window.addEventListener('resize', scaleRoot);
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="shop" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      injectPhoneFrame();
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <GameProvider>
                <RootLayoutNav />
              </GameProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
