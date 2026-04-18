import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { Tile } from '../context/GameContext';
import TileComponent from './TileComponent';

const TRAY_SIZE = 7;
const SCREEN_WIDTH = Dimensions.get('window').width;

const GAP = 5;
const PADDING = 12;
const SLOT_SIZE = Math.floor((SCREEN_WIDTH - PADDING * 2 - GAP * (TRAY_SIZE - 1)) / TRAY_SIZE);

interface TrayBarProps {
  tray: Tile[];
}

export default function TrayBar({ tray }: TrayBarProps) {
  const slots = Array(TRAY_SIZE).fill(null);
  const fillRatio = tray.length / TRAY_SIZE;
  const isDanger = tray.length >= 5;
  const isCritical = tray.length >= 7;

  const barColor = isCritical
    ? '#ff1744'
    : isDanger
    ? '#ff6b35'
    : '#4caf50';

  return (
    <View style={styles.wrapper}>
      {/* Fill indicator bar */}
      <View style={styles.fillTrack}>
        <View
          style={[
            styles.fillBar,
            {
              width: `${fillRatio * 100}%` as any,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>

      {/* Slots */}
      <View style={styles.container}>
        {slots.map((_, idx) => {
          const tile = tray[idx];
          const isLast = idx === tray.length - 1;
          return (
            <View
              key={idx}
              style={[
                styles.slot,
                {
                  width: SLOT_SIZE,
                  height: SLOT_SIZE,
                  borderRadius: SLOT_SIZE * 0.2,
                },
                tile && isLast && isDanger && styles.slotDanger,
              ]}
            >
              {tile ? (
                <TileComponent
                  tile={tile}
                  size={SLOT_SIZE}
                  onPress={() => {}}
                  disabled
                />
              ) : (
                <View style={[styles.emptySlotInner, { borderRadius: SLOT_SIZE * 0.18 }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Slot count label */}
      <Text style={[styles.countLabel, isDanger && { color: barColor }]}>
        {tray.length} / {TRAY_SIZE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 8,
    marginBottom: 4,
  },
  fillTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginHorizontal: PADDING,
    marginBottom: 6,
    overflow: 'hidden',
  },
  fillBar: {
    height: '100%',
    borderRadius: 2,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: GAP,
    paddingHorizontal: PADDING,
    paddingVertical: 8,
    backgroundColor: 'rgba(30,10,60,0.7)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(90,50,140,0.5)',
  },
  slot: {
    backgroundColor: 'rgba(20,8,40,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(80,50,120,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotDanger: {
    borderColor: '#ff6b3588',
  },
  emptySlotInner: {
    width: '70%',
    height: '70%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  countLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
