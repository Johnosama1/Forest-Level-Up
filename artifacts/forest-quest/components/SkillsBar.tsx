import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SkillsBarProps {
  greenCount: number;
  redCount: number;
  purpleCount: number;
  onGreen: () => void;
  onRed: () => void;
  onPurple: () => void;
  redDisabled?: boolean;
}

export default function SkillsBar({
  greenCount,
  redCount,
  purpleCount,
  onGreen,
  onRed,
  onPurple,
  redDisabled,
}: SkillsBarProps) {
  return (
    <View style={styles.container}>
      <SkillButton
        color="#4caf50"
        count={greenCount}
        onPress={onGreen}
        icon="plus-circle"
        label="مساعد"
        testID="skill-green"
        disabled={false}
      />
      <SkillButton
        color="#ff7043"
        count={redCount}
        onPress={onRed}
        icon="rotate-ccw"
        label="تراجع"
        testID="skill-red"
        disabled={redDisabled && redCount > 0}
      />
      <SkillButton
        color="#ab47bc"
        count={purpleCount}
        onPress={onPurple}
        icon="crosshair"
        label="إنقاذ"
        testID="skill-purple"
        disabled={false}
      />
    </View>
  );
}

interface SkillButtonProps {
  color: string;
  count: number;
  onPress: () => void;
  icon: string;
  label: string;
  testID?: string;
  disabled?: boolean;
}

function SkillButton({ color, count, onPress, icon, label, testID, disabled }: SkillButtonProps) {
  const isEmpty = count <= 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!disabled}
      activeOpacity={0.75}
      testID={testID}
      style={[
        styles.skillBtn,
        {
          borderColor: isEmpty ? 'rgba(255,255,255,0.1)' : color + '55',
          backgroundColor: isEmpty ? 'rgba(20,10,40,0.8)' : color + '18',
          shadowColor: isEmpty ? '#000' : color,
        },
        disabled && styles.btnDisabled,
      ]}
    >
      {/* Icon circle */}
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isEmpty ? 'rgba(40,25,70,0.9)' : color + '28',
            borderColor: isEmpty ? 'rgba(255,255,255,0.08)' : color + '66',
          },
        ]}
      >
        <Feather
          name={icon as any}
          size={20}
          color={isEmpty ? 'rgba(255,255,255,0.25)' : color}
        />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: isEmpty ? 'rgba(255,255,255,0.25)' : color }]}>
        {label}
      </Text>

      {/* Count badge */}
      <View
        style={[
          styles.badge,
          isEmpty
            ? styles.badgeEmpty
            : { backgroundColor: color, shadowColor: color },
        ]}
      >
        {isEmpty ? (
          <Feather name="shopping-cart" size={9} color="rgba(255,255,255,0.4)" />
        ) : (
          <Text style={styles.badgeText}>{count}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skillBtn: {
    width: 78,
    height: 78,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 4,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0d0820',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeEmpty: {
    backgroundColor: 'rgba(40,25,70,0.9)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
});
