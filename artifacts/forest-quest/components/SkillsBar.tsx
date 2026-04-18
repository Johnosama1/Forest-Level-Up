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
  greenDisabled?: boolean;
  redDisabled?: boolean;
  purpleDisabled?: boolean;
}

export default function SkillsBar({
  greenCount,
  redCount,
  purpleCount,
  onGreen,
  onRed,
  onPurple,
  greenDisabled,
  redDisabled,
  purpleDisabled,
}: SkillsBarProps) {
  return (
    <View style={styles.container}>
      <SkillButton
        color="#4caf50"
        glowColor="#4caf5066"
        count={greenCount}
        onPress={onGreen}
        disabled={greenDisabled || greenCount <= 0}
        icon="plus-circle"
        testID="skill-green"
      />
      <SkillButton
        color="#e53935"
        glowColor="#e5393566"
        count={redCount}
        onPress={onRed}
        disabled={redDisabled || redCount <= 0}
        icon="rotate-ccw"
        testID="skill-red"
      />
      <SkillButton
        color="#9c27b0"
        glowColor="#9c27b066"
        count={purpleCount}
        onPress={onPurple}
        disabled={purpleDisabled || purpleCount <= 0}
        icon="shuffle"
        testID="skill-purple"
      />
    </View>
  );
}

interface SkillButtonProps {
  color: string;
  glowColor: string;
  count: number;
  onPress: () => void;
  disabled?: boolean;
  icon: string;
  testID?: string;
}

function SkillButton({ color, glowColor, count, onPress, disabled, icon, testID }: SkillButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[
        styles.skillBtn,
        { backgroundColor: disabled ? '#333' : color + '33', borderColor: disabled ? '#555' : color },
      ]}
      testID={testID}
    >
      <View style={[styles.iconWrapper, { backgroundColor: disabled ? '#444' : glowColor }]}>
        <Feather name={icon as any} size={22} color={disabled ? '#777' : color} />
      </View>
      <View style={[styles.badge, { backgroundColor: disabled ? '#555' : color }]}>
        <Text style={styles.badgeText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingVertical: 8,
  },
  skillBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1a0e2e',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
