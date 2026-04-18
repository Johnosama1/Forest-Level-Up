import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tile } from '../context/GameContext';
import TileComponent from './TileComponent';

const TRAY_SIZE = 7;

interface TrayBarProps {
  tray: Tile[];
  tileSize: number;
}

export default function TrayBar({ tray, tileSize }: TrayBarProps) {
  const slots = Array(TRAY_SIZE).fill(null);

  return (
    <View style={styles.container}>
      {slots.map((_, idx) => {
        const tile = tray[idx];
        return (
          <View key={idx} style={[styles.slot, { width: tileSize, height: tileSize, borderRadius: tileSize * 0.15 }]}>
            {tile && (
              <TileComponent
                tile={tile}
                size={tileSize}
                onPress={() => {}}
                disabled
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#2d1b4e88',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a307088',
    marginHorizontal: 8,
  },
  slot: {
    backgroundColor: '#1a0e2e55',
    borderWidth: 1,
    borderColor: '#4a307066',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
