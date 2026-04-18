import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '@/context/GameContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = require('../../assets/images/forest_bg.jpg');

const TOTAL_LEVELS = 1000;

// Milestone levels shown visually on the tower
const MILESTONES = [1, 2, 10, 100, 1000];

export default function LevelMapScreen() {
  const { gameState } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleLevelPress = (level: number) => {
    if (level > gameState.unlockedLevel) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/game', params: { level } });
  };

  // We show levels in groups: show nearby unlocked levels + milestone tiers
  const visibleLevels = buildVisibleLevels(gameState.unlockedLevel);

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsLabel}>العملات الذهبية</Text>
            <View style={styles.coinsRow}>
              <Text style={styles.coinsIcon}>🪙</Text>
              <Text style={styles.coinsValue}>{gameState.coins.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.shopBtn}
              onPress={() => router.push('/shop')}
              testID="shop-btn"
            >
              <Feather name="shopping-bag" size={20} color="#f5a623" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exitBtn}
              onPress={() => {
                const { Alert } = require('react-native');
                Alert.alert('هل تريد الخروج؟', 'هل تريد الخروج من اللعبة؟', [
                  { text: 'لا', style: 'cancel' },
                  { text: 'نعم', style: 'destructive', onPress: () => {} },
                ]);
              }}
              testID="main-exit-btn"
            >
              <Feather name="x" size={20} color="#e53935" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tower / Level Map */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.towerContainer}>
            <View style={styles.towerLevels}>
              {visibleLevels.map((levelData, idx) => (
                <LevelNode
                  key={levelData.level}
                  level={levelData.level}
                  unlocked={levelData.level <= gameState.unlockedLevel}
                  current={levelData.level === gameState.unlockedLevel}
                  milestone={levelData.isMilestone}
                  onPress={handleLevelPress}
                />
              ))}
            </View>
          </View>

          {/* Current Level big button */}
          <TouchableOpacity
            style={styles.currentLevelBtn}
            onPress={() => handleLevelPress(gameState.unlockedLevel)}
            testID="play-current-btn"
          >
            <Text style={styles.currentLevelText}>
              الدور الأول • Level {gameState.unlockedLevel}
            </Text>
            <Feather name="play" size={18} color="#1a0e2e" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

interface LevelNodeProps {
  level: number;
  unlocked: boolean;
  current: boolean;
  milestone: boolean;
  onPress: (level: number) => void;
}

function LevelNode({ level, unlocked, current, milestone, onPress }: LevelNodeProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const getLevelLabel = () => {
    if (level === 1000) return 'الدور الـ1000\nLevel 1000';
    if (level === 100) return 'الدور المائة\nLevel 100';
    if (level === 10) return 'الدور العاشر\nLevel 10';
    if (level === 2) return 'الدور الثاني\nLevel 2';
    return `Level ${level}`;
  };

  const handlePress = () => {
    if (!unlocked) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    onPress(level);
  };

  if (milestone) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={unlocked ? 0.7 : 1}>
        <Animated.View
          style={[
            styles.milestoneNode,
            !unlocked && styles.lockedMilestone,
            current && styles.currentMilestone,
            { transform: [{ scale }] },
          ]}
        >
          {!unlocked && <Feather name="lock" size={14} color="#666" style={styles.lockIcon} />}
          <Text style={[styles.milestoneLabelText, !unlocked && styles.lockedText]}>
            {getLevelLabel()}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={unlocked ? 0.7 : 1}>
      <Animated.View
        style={[
          styles.levelDot,
          unlocked ? styles.levelDotUnlocked : styles.levelDotLocked,
          current && styles.levelDotCurrent,
          { transform: [{ scale }] },
        ]}
      >
        {unlocked ? (
          <Text style={styles.levelDotText}>{level}</Text>
        ) : (
          <Feather name="lock" size={12} color="#666" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function buildVisibleLevels(unlockedLevel: number) {
  const items: Array<{ level: number; isMilestone: boolean }> = [];
  const shown = new Set<number>();

  // Always show milestones
  for (const ml of MILESTONES) {
    if (!shown.has(ml)) {
      items.push({ level: ml, isMilestone: true });
      shown.add(ml);
    }
  }

  // Show levels around current unlock
  for (let i = Math.max(1, unlockedLevel - 2); i <= Math.min(TOTAL_LEVELS, unlockedLevel + 3); i++) {
    if (!shown.has(i)) {
      items.push({ level: i, isMilestone: false });
      shown.add(i);
    }
  }

  return items.sort((a, b) => b.level - a.level);
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,5,25,0.55)' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  coinsBadge: {
    backgroundColor: '#2d1b4eee',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f5a62344',
  },
  coinsLabel: {
    color: '#9b8ec4',
    fontSize: 11,
    marginBottom: 2,
    fontFamily: 'Inter_500Medium',
  },
  coinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  coinsIcon: { fontSize: 18 },
  coinsValue: {
    color: '#f5a623',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'Inter_700Bold',
  },
  headerRight: { flexDirection: 'row', gap: 8 },
  shopBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#2d1b4eee',
    borderWidth: 1, borderColor: '#f5a62344',
    alignItems: 'center', justifyContent: 'center',
  },
  exitBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#2d1b4eee',
    borderWidth: 1, borderColor: '#e5393544',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  towerContainer: {
    width: SCREEN_WIDTH - 32,
    alignItems: 'center',
    backgroundColor: 'rgba(20,10,40,0.6)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a307066',
    paddingVertical: 16,
    marginBottom: 8,
  },
  towerLevels: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 10,
  },
  milestoneNode: {
    backgroundColor: '#2d1b4eee',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#f5a623',
    paddingHorizontal: 18,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 160,
    position: 'relative',
  },
  lockedMilestone: {
    borderColor: '#4a3070',
    backgroundColor: '#1a0e2ecc',
  },
  currentMilestone: {
    borderColor: '#f5a623',
    backgroundColor: '#3d2b5e',
  },
  milestoneLabelText: {
    color: '#f5e6d3',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  lockedText: { color: '#666' },
  lockIcon: { position: 'absolute', top: 6, right: 6 },
  levelDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelDotUnlocked: {
    backgroundColor: '#4a307099',
    borderColor: '#f5a623',
  },
  levelDotLocked: {
    backgroundColor: '#1a0e2e88',
    borderColor: '#4a307055',
  },
  levelDotCurrent: {
    backgroundColor: '#f5a62322',
    borderColor: '#f5a623',
  },
  levelDotText: {
    color: '#f5e6d3',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  currentLevelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f5a623',
    borderRadius: 18,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 16,
    width: SCREEN_WIDTH - 64,
    elevation: 4,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  currentLevelText: {
    color: '#1a0e2e',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
});
