import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Platform } from 'react-native';

interface TreeProps {
  leftPct: string;   // e.g. '10%'
  size: number;
  delay: number;
  speed: number;
  opacity: number;
  color: string;
}

function SwayTree({ leftPct, size, delay, speed, opacity, color }: TreeProps) {
  const sway = useRef(new Animated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: speed,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
        Animated.timing(sway, {
          toValue: -1,
          duration: speed,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNative,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ['-3deg', '3deg'] });

  const trunkH = size * 0.42;
  const crownW = size * 0.55;
  const crownH = size * 0.72;
  const trunkW = size * 0.09;

  return (
    <View style={[styles.treeSlot, { left: leftPct as any, bottom: 0 }]}>
      <Animated.View style={{ transform: [{ rotate }], transformOrigin: 'bottom center' as any }}>
        {/* Three-layer crown (small → medium → large) */}
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.triangle, {
            borderBottomWidth: crownH * 0.52, borderLeftWidth: crownW * 0.38, borderRightWidth: crownW * 0.38,
            borderBottomColor: color, opacity: opacity * 0.6,
          }]} />
          <View style={[styles.triangle, {
            borderBottomWidth: crownH * 0.62, borderLeftWidth: crownW * 0.44, borderRightWidth: crownW * 0.44,
            borderBottomColor: color, opacity: opacity * 0.78, marginTop: -(crownH * 0.62 * 0.3),
          }]} />
          <View style={[styles.triangle, {
            borderBottomWidth: crownH * 0.75, borderLeftWidth: crownW * 0.5, borderRightWidth: crownW * 0.5,
            borderBottomColor: color, opacity, marginTop: -(crownH * 0.75 * 0.28),
          }]} />
          {/* Trunk */}
          <View style={{
            width: trunkW, height: trunkH,
            backgroundColor: color, opacity: opacity * 0.5, borderRadius: 3,
          }} />
        </View>
      </Animated.View>
    </View>
  );
}

const TREES: TreeProps[] = [
  { leftPct: '-2%',  size: 155, delay: 0,    speed: 3800, opacity: 0.20, color: '#1a3a0a' },
  { leftPct: '7%',   size: 120, delay: 700,  speed: 4400, opacity: 0.14, color: '#0f2908' },
  { leftPct: '70%',  size: 145, delay: 1200, speed: 3600, opacity: 0.18, color: '#173206' },
  { leftPct: '83%',  size: 175, delay: 400,  speed: 4200, opacity: 0.22, color: '#0d2507' },
  { leftPct: '50%',  size: 95,  delay: 900,  speed: 5100, opacity: 0.10, color: '#142808' },
];

export default function AnimatedTrees() {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {TREES.map((t, i) => <SwayTree key={i} {...t} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  treeSlot: {
    position: 'absolute',
    justifyContent: 'flex-end',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderStyle: 'solid',
  },
});
