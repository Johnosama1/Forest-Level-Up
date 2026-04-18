import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
  View,
  Animated,
} from 'react-native';
import { Tile, TileSymbol } from '../context/GameContext';
import { SYMBOL_COLORS } from '../utils/gameLogic';

const TILE_IMAGES: Record<TileSymbol, any> = {
  apple: require('../assets/tiles/apple.png'),
  pear: require('../assets/tiles/pear.png'),
  grape: require('../assets/tiles/grape.png'),
  orange: require('../assets/tiles/orange.png'),
  lemon: require('../assets/tiles/lemon.png'),
  mushroom: require('../assets/tiles/mushroom.png'),
  leaf: require('../assets/tiles/leaf.png'),
  acorn: require('../assets/tiles/acorn.png'),
  pinecone: require('../assets/tiles/pinecone.png'),
  berry: require('../assets/tiles/berry.png'),
  fox: require('../assets/tiles/fox.png'),
  wolf: require('../assets/tiles/wolf.png'),
  owl: require('../assets/tiles/owl.png'),
  deer: require('../assets/tiles/deer.png'),
  rabbit: require('../assets/tiles/rabbit.png'),
  rune: require('../assets/tiles/rune.png'),
  compass: require('../assets/tiles/compass.png'),
  crystal: require('../assets/tiles/crystal.png'),
  bat: require('../assets/tiles/bat.png'),
  hedgehog: require('../assets/tiles/hedgehog.png'),
};

interface TileComponentProps {
  tile: Tile;
  size: number;
  onPress: (tile: Tile) => void;
  onLongPress?: (tile: Tile) => void;
  disabled?: boolean;
  style?: ViewStyle;
  /** Idle breathing animation — pass false to disable (e.g. in tray) */
  animate?: boolean;
  /** Highlight as selected / being dragged */
  highlighted?: boolean;
}

export default function TileComponent({
  tile,
  size,
  onPress,
  onLongPress,
  disabled,
  style,
  animate = true,
  highlighted = false,
}: TileComponentProps) {
  const color = SYMBOL_COLORS[tile.symbol];
  const bgColor = color + '30';
  const borderColor = highlighted ? color : color + 'cc';
  const imgSrc = TILE_IMAGES[tile.symbol];
  const radius = size * 0.2;

  // ── Idle breath animation (state: idle) ─────────────────
  const idleScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!animate || disabled) return;

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(idleScale, { toValue: 1.04, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(idleScale, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [animate, disabled]);

  // ── Press animation (state: action) ─────────────────────
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.87,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [
          { scale: Animated.multiply(idleScale, pressScale) },
        ],
      }}
    >
      <TouchableOpacity
        onPress={() => !disabled && onPress(tile)}
        onLongPress={onLongPress ? () => onLongPress(tile) : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        delayLongPress={280}
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            backgroundColor: bgColor,
            borderColor: highlighted ? color : borderColor,
            borderWidth: highlighted ? 3 : 2,
            borderRadius: radius,
            shadowColor: color,
          },
          style,
        ]}
        disabled={disabled}
        testID={`tile-${tile.symbol}`}
      >
        <Image
          source={imgSrc}
          style={{ width: size * 0.72, height: size * 0.72 }}
          resizeMode="contain"
        />

        {/* Gloss highlight (idle state overlay) */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.gloss,
            {
              borderRadius: radius,
              width: size * 0.55,
              height: size * 0.35,
              top: size * 0.07,
              left: size * 0.08,
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Highlighted / drag-in-progress ring */}
        {highlighted && (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                borderRadius: radius,
                borderWidth: 2,
                borderColor: color,
                backgroundColor: color + '22',
              },
            ]}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    elevation: 5,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
