import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
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
        color="#e07030"
        count={redCount}
        onPress={onRed}
        icon="rotate-ccw"
        label="تراجع"
        testID="skill-red"
        disabled={redDisabled && redCount > 0}
      />
      <SkillButton
        color="#9c27b0"
        count={purpleCount}
        onPress={onPurple}
        icon="shuffle"
        label="خلط"
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
          borderColor: isEmpty ? '#555' : color,
          backgroundColor: isEmpty ? '#1a0e2e' : color + '22',
        },
        disabled && styles.btnDisabled,
      ]}
    >
      {/* Glow ring when has charges */}
      {!isEmpty && (
        <View
          style={[styles.glowRing, { borderColor: color + '55', shadowColor: color }]}
        />
      )}

      {/* Icon */}
      <View style={[
        styles.iconWrapper,
        { backgroundColor: isEmpty ? '#252030' : color + '33' },
      ]}>
        <Feather
          name={icon as any}
          size={22}
          color={isEmpty ? '#555' : color}
        />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: isEmpty ? '#555' : color }]}>{label}</Text>

      {/* Count badge */}
      <View style={[
        styles.badge,
        isEmpty ? styles.badgeEmpty : { backgroundColor: color },
      ]}>
        {isEmpty ? (
          <Feather name="shopping-cart" size={10} color="#aaa" />
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
    gap: 22,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skillBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  glowRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    top: -6,
    left: -6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 0,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0d0820',
  },
  badgeEmpty: {
    backgroundColor: '#2a2040',
    borderColor: '#555',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
});
