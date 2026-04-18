import React from 'react';
import {
  TouchableOpacity,
  Image,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native';
import { Tile } from '../context/GameContext';
import { TileSymbol } from '../context/GameContext';
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
  disabled?: boolean;
  style?: ViewStyle;
}

export default function TileComponent({ tile, size, onPress, disabled, style }: TileComponentProps) {
  const color = SYMBOL_COLORS[tile.symbol];
  const bgColor = color + '30';
  const borderColor = color + 'cc';
  const imgSrc = TILE_IMAGES[tile.symbol];
  const radius = size * 0.2;

  return (
    <TouchableOpacity
      onPress={() => !disabled && onPress(tile)}
      activeOpacity={0.72}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          borderColor: borderColor,
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
      {/* Gloss highlight */}
      <View
        pointerEvents="none"
        style={[
          styles.gloss,
          { borderRadius: radius, width: size * 0.55, height: size * 0.35, top: size * 0.07, left: size * 0.08 },
        ]}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
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
