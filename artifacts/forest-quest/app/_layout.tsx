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
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View, StyleSheet } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const PHONE_W = 390;
const PHONE_H = 844;

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="shop" options={{ headerShown: false }} />
    </Stack>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(0.75);

  useEffect(() => {
    function update() {
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const s = Math.min((winH - 20) / PHONE_H, (winW - 40) / PHONE_W, 1);
      setScale(s);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw',
      height: '100vh',
      background: '#0a0614',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'relative',
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
      }}>
        {/* Phone shell */}
        <div style={{
          width: PHONE_W + 28,
          height: PHONE_H + 28,
          background: 'linear-gradient(145deg, #2a2d5e, #1a1c3e, #141630)',
          borderRadius: 58,
          padding: 14,
          boxShadow: '0 30px 80px rgba(0,0,0,0.95), 0 0 0 1px #3a3d6e, inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
        }}>
          {/* Left buttons */}
          <div style={{ position: 'absolute', left: -4, top: 110, width: 4, height: 28, background: '#1e2050', borderRadius: '3px 0 0 3px' }} />
          <div style={{ position: 'absolute', left: -4, top: 150, width: 4, height: 28, background: '#1e2050', borderRadius: '3px 0 0 3px' }} />
          {/* Right button */}
          <div style={{ position: 'absolute', right: -4, top: 130, width: 4, height: 52, background: '#1e2050', borderRadius: '0 3px 3px 0' }} />

          {/* Screen */}
          <div style={{
            width: PHONE_W,
            height: PHONE_H,
            background: '#000',
            borderRadius: 44,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Notch */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 126,
              height: 37,
              background: '#000',
              borderBottomLeftRadius: 22,
              borderBottomRightRadius: 22,
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              {/* Speaker */}
              <div style={{ width: 40, height: 5, background: '#1a1a2e', borderRadius: 3 }} />
              {/* Camera */}
              <div style={{ width: 11, height: 11, background: '#1a1a3e', borderRadius: '50%', border: '1px solid #2a2a4e' }} />
            </div>

            {/* App content fills full screen */}
            <div style={{ width: '100%', height: '100%' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
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
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  const isWeb = Platform.OS === 'web';

  const content = (
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

  if (isWeb) {
    return <PhoneFrame>{content}</PhoneFrame>;
  }

  return content;
}
