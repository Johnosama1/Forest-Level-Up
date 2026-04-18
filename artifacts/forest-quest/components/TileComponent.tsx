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
  const bgColor = SYMBOL_COLORS[tile.symbol] + '2a';
  const borderColor = SYMBOL_COLORS[tile.symbol] + '99';
  const imgSrc = TILE_IMAGES[tile.symbol];

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
          borderRadius: size * 0.18,
        },
        style,
      ]}
      disabled={disabled}
      testID={`tile-${tile.symbol}`}
    >
      <Image
        source={imgSrc}
        style={{ width: size * 0.78, height: size * 0.78 }}
        resizeMode="contain"
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
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});
