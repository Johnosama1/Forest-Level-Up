import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Tile } from '../context/GameContext';
import TileComponent from './TileComponent';

const TRAY_SIZE = 7;
const SCREEN_WIDTH = Dimensions.get('window').width;

// Always fit all 7 slots in one row
const GAP = 4;
const PADDING = 16;
const SLOT_SIZE = Math.floor((SCREEN_WIDTH - PADDING * 2 - GAP * (TRAY_SIZE - 1)) / TRAY_SIZE);

interface TrayBarProps {
  tray: Tile[];
}

export default function TrayBar({ tray }: TrayBarProps) {
  const slots = Array(TRAY_SIZE).fill(null);

  return (
    <View style={styles.container}>
      {slots.map((_, idx) => {
        const tile = tray[idx];
        return (
          <View
            key={idx}
            style={[
              styles.slot,
              {
                width: SLOT_SIZE,
                height: SLOT_SIZE,
                borderRadius: SLOT_SIZE * 0.18,
              },
            ]}
          >
            {tile && (
              <TileComponent
                tile={tile}
                size={SLOT_SIZE}
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
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: PADDING,
    paddingVertical: 8,
    backgroundColor: '#2d1b4e88',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4a307088',
    marginHorizontal: 8,
    marginBottom: 4,
  },
  slot: {
    backgroundColor: '#1a0e2e55',
    borderWidth: 1,
    borderColor: '#4a307066',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
