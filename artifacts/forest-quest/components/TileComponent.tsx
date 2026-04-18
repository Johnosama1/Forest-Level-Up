import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { Tile } from '../context/GameContext';
import { getSymbolEmoji, SYMBOL_COLORS } from '../utils/gameLogic';

interface TileComponentProps {
  tile: Tile;
  size: number;
  onPress: (tile: Tile) => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function TileComponent({ tile, size, onPress, disabled, style }: TileComponentProps) {
  const bgColor = SYMBOL_COLORS[tile.symbol] + '33';
  const borderColor = SYMBOL_COLORS[tile.symbol] + '88';

  return (
    <TouchableOpacity
      onPress={() => !disabled && onPress(tile)}
      activeOpacity={0.7}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderRadius: size * 0.15,
        },
        style,
      ]}
      disabled={disabled}
      testID={`tile-${tile.symbol}`}
    >
      <Text style={{ fontSize: size * 0.55 }}>{getSymbolEmoji(tile.symbol)}</Text>
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
