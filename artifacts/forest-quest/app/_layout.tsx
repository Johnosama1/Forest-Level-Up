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
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function update() {
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const scaleH = (winH - 40) / PHONE_H;
      const scaleW = (winW - 80) / PHONE_W;
      setScale(Math.min(scaleH, scaleW, 1));
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const phoneStyle: any = {
    width: PHONE_W,
    height: PHONE_H,
    borderRadius: 52,
    backgroundColor: '#0d0b1e',
    overflow: 'hidden',
    borderWidth: 10,
    borderColor: '#252545',
    transform: [{ scale }],
    boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px #1a1a3a',
    position: 'relative',
  };

  return (
    <View style={webStyles.pageWrapper}>
      {/* Side buttons via absolute positioned views */}
      <View style={{ position: 'relative' }}>
        {/* Left volume buttons */}
        <View style={[webStyles.btn, { left: -8 * scale + 'px' as any, top: 100 * scale, height: 30 * scale }]} />
        <View style={[webStyles.btn, { left: -8 * scale + 'px' as any, top: 140 * scale, height: 30 * scale }]} />
        {/* Right power button */}
        <View style={[webStyles.btn, { right: -8 * scale + 'px' as any, top: 120 * scale, height: 50 * scale }]} />

        <View style={phoneStyle as any}>
          {/* Notch */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: '50%' as any,
              transform: [{ translateX: -60 }],
              width: 120,
              height: 34,
              backgroundColor: '#0d0b1e',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              zIndex: 100,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{
              width: 10, height: 10, borderRadius: 5,
              backgroundColor: '#1a1a35',
              borderWidth: 1, borderColor: '#2a2a55',
            }} />
          </View>

          {/* App content */}
          <View style={{ flex: 1 }}>
            {children}
          </View>
        </View>
      </View>
    </View>
  );
}

const webStyles = StyleSheet.create({
  pageWrapper: {
    flex: 1,
    backgroundColor: '#050310',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    position: 'absolute',
    width: 4,
    backgroundColor: '#252545',
    borderRadius: 3,
    zIndex: 10,
  },
});

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
