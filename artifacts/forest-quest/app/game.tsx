import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Alert,
  Animated,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '@/context/GameContext';
import { Tile } from '@/context/GameContext';
import {
  generateTiles,
  checkMatch,
  isBoardEmpty,
  isTrayFull,
  hasTwinsInTray,
  shuffle,
  getSymbolEmoji,
  SYMBOL_COLORS,
} from '@/utils/gameLogic';
import TileComponent from '@/components/TileComponent';
import TrayBar from '@/components/TrayBar';
import SkillsBar from '@/components/SkillsBar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = require('../assets/images/forest_bg.jpg');

function genId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export default function GameScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const currentLevel = parseInt(level || '1', 10);
  const insets = useSafeAreaInsets();
  const { gameState, updateCoins, unlockLevel, updateSkills } = useGame();

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [tray, setTray] = useState<Tile[]>([]);
  const [skillGreen, setSkillGreen] = useState(gameState.skillGreen);
  const [skillRed, setSkillRed] = useState(gameState.skillRed);
  const [skillPurple, setSkillPurple] = useState(gameState.skillPurple);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [matchAnim] = useState(new Animated.Value(1));
  const [coinPopup, setCoinPopup] = useState<string | null>(null);

  // Sync skills from gameState on mount
  useEffect(() => {
    setSkillGreen(gameState.skillGreen);
    setSkillRed(gameState.skillRed);
    setSkillPurple(gameState.skillPurple);
  }, []);

  useEffect(() => {
    startLevel();
  }, [currentLevel]);

  const startLevel = useCallback(() => {
    const newTiles = generateTiles(currentLevel);
    setTiles(newTiles);
    setTray([]);
    setWon(false);
    setLost(false);
  }, [currentLevel]);

  // Save skills back to context whenever they change
  useEffect(() => {
    updateSkills(skillGreen, skillRed, skillPurple);
  }, [skillGreen, skillRed, skillPurple]);

  const gridCols = tiles.length > 0
    ? Math.ceil(Math.sqrt(tiles.length + (tiles.length > 25 ? 10 : 5)))
    : 5;

  const tileSize = Math.min(
    Math.floor((SCREEN_WIDTH - 32) / Math.min(gridCols, 9)),
    52
  );

  const handleTilePress = useCallback((tile: Tile) => {
    if (won || lost) return;
    if (isTrayFull(tray) && tray.length >= 7) {
      // check if tile's symbol would match
    }

    const newTray = [...tray, tile];
    const newTiles = tiles.filter(t => t.id !== tile.id);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if tray matches (3 of same)
    const matchedSym = checkMatch(newTray);
    if (matchedSym) {
      // Remove matched 3
      const matchIndices: number[] = [];
      let count = 0;
      for (let i = newTray.length - 1; i >= 0 && count < 3; i--) {
        if (newTray[i].symbol === matchedSym) {
          matchIndices.push(i);
          count++;
        }
      }
      const afterMatch = newTray.filter((_, i) => !matchIndices.includes(i));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateCoins(100);
      showCoinPopup('+100');

      setTray(afterMatch);
      setTiles(newTiles);

      if (isBoardEmpty(newTiles) && afterMatch.length === 0) {
        setTimeout(() => {
          setWon(true);
          unlockLevel(currentLevel + 1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 300);
      }
    } else {
      // Check if tray is now full (7 slots)
      if (newTray.length >= 7) {
        setTray(newTray);
        setTiles(newTiles);
        setTimeout(() => {
          setLost(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }, 300);
      } else {
        setTray(newTray);
        setTiles(newTiles);

        if (isBoardEmpty(newTiles) && newTray.length === 0) {
          setTimeout(() => {
            setWon(true);
            unlockLevel(currentLevel + 1);
          }, 300);
        }
      }
    }
  }, [tray, tiles, won, lost, currentLevel]);

  const showCoinPopup = (text: string) => {
    setCoinPopup(text);
    setTimeout(() => setCoinPopup(null), 1200);
  };

  // GREEN SKILL: Completes a pair in tray by adding 3rd tile from board
  const handleGreenSkill = useCallback(() => {
    if (skillGreen <= 0) return;
    const twin = hasTwinsInTray(tray);
    if (!twin) {
      // Find any symbol that has 2 in tray
      Alert.alert('مهارة خضراء', 'تحتاج لاثنين من نفس الشكل في الشريط أولاً');
      return;
    }
    const { symbol } = twin;
    // Find this symbol in board tiles
    const boardTile = tiles.find(t => t.symbol === symbol);
    if (!boardTile) {
      Alert.alert('مهارة خضراء', 'لا يوجد هذا الشكل في اللوح');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTiles = tiles.filter(t => t.id !== boardTile.id);
    const newTray = [...tray, boardTile];
    const matchedSym = checkMatch(newTray);
    if (matchedSym) {
      const matchIndices: number[] = [];
      let count = 0;
      for (let i = newTray.length - 1; i >= 0 && count < 3; i--) {
        if (newTray[i].symbol === matchedSym) { matchIndices.push(i); count++; }
      }
      const afterMatch = newTray.filter((_, i) => !matchIndices.includes(i));
      updateCoins(100);
      showCoinPopup('+100');
      setTray(afterMatch);
      setTiles(newTiles);
      if (isBoardEmpty(newTiles) && afterMatch.length === 0) {
        setTimeout(() => { setWon(true); unlockLevel(currentLevel + 1); }, 300);
      }
    } else {
      setTray(newTray);
      setTiles(newTiles);
    }
    setSkillGreen(prev => prev - 1);
  }, [skillGreen, tray, tiles, currentLevel]);

  // RED SKILL: Remove last placed tile from tray back to board
  const handleRedSkill = useCallback(() => {
    if (skillRed <= 0 || tray.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lastTile = tray[tray.length - 1];
    const newTray = tray.slice(0, -1);
    const newTiles = [...tiles, lastTile];
    setTray(newTray);
    setTiles(newTiles);
    setSkillRed(prev => prev - 1);
  }, [skillRed, tray, tiles]);

  // PURPLE SKILL: Shuffle board tiles AND give one extra tile from board matching a pair in tray
  const handlePurpleSkill = useCallback(() => {
    if (skillPurple <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Shuffle board
    const shuffledTiles = shuffle(tiles.map((t, i) => ({
      ...t,
      row: Math.floor(i / gridCols),
      col: i % gridCols,
    })));

    // Try to give a helpful tile if there's a pair in tray
    const twin = hasTwinsInTray(tray);
    if (twin) {
      const helpTile = shuffledTiles.find(t => t.symbol === twin.symbol);
      if (helpTile) {
        const remaining = shuffledTiles.filter(t => t.id !== helpTile.id);
        const newTray = [...tray, helpTile];
        const matchedSym = checkMatch(newTray);
        if (matchedSym) {
          const matchIndices: number[] = [];
          let count = 0;
          for (let i = newTray.length - 1; i >= 0 && count < 3; i--) {
            if (newTray[i].symbol === matchedSym) { matchIndices.push(i); count++; }
          }
          const afterMatch = newTray.filter((_, i) => !matchIndices.includes(i));
          updateCoins(100);
          showCoinPopup('+100');
          setTray(afterMatch);
          setTiles(remaining);
          setSkillPurple(prev => prev - 1);
          return;
        }
        setTray(newTray);
        setTiles(remaining);
        setSkillPurple(prev => prev - 1);
        return;
      }
    }
    setTiles(shuffledTiles);
    setSkillPurple(prev => prev - 1);
  }, [skillPurple, tiles, tray, gridCols]);

  const handleExit = () => {
    Alert.alert('هل تريد الخروج؟', 'سيتم فقدان تقدمك في هذا المستوى', [
      { text: 'لا', style: 'cancel' },
      { text: 'نعم', onPress: () => router.back(), style: 'destructive' },
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleExit} style={styles.exitBtn} testID="exit-btn">
            <Feather name="x" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.levelText}>المستوى {currentLevel}</Text>
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsText}>🪙 {gameState.coins.toLocaleString()}</Text>
          </View>
        </View>

        {/* Coin popup */}
        {coinPopup && (
          <View style={styles.coinPopup}>
            <Text style={styles.coinPopupText}>{coinPopup}</Text>
          </View>
        )}

        {/* Game Grid */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.gridContainer, { borderRadius: 16 }]}>
            {Array.from({ length: Math.ceil(tiles.length / gridCols) }).map((_, row) => (
              <View key={row} style={styles.gridRow}>
                {tiles.slice(row * gridCols, (row + 1) * gridCols).map(tile => (
                  <TileComponent
                    key={tile.id}
                    tile={tile}
                    size={tileSize}
                    onPress={handleTilePress}
                    disabled={won || lost}
                  />
                ))}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Skills */}
        <SkillsBar
          greenCount={skillGreen}
          redCount={skillRed}
          purpleCount={skillPurple}
          onGreen={handleGreenSkill}
          onRed={handleRedSkill}
          onPurple={handlePurpleSkill}
          redDisabled={tray.length === 0}
        />

        {/* Tray */}
        <TrayBar tray={tray} tileSize={tileSize} />

        {/* Win Overlay */}
        {won && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🏆</Text>
              <Text style={styles.resultTitle}>رائع! فزت!</Text>
              <Text style={styles.resultSub}>المستوى {currentLevel} مكتمل</Text>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => router.replace({ pathname: '/game', params: { level: currentLevel + 1 } })}
                testID="next-level-btn"
              >
                <Text style={styles.nextBtnText}>المستوى التالي ←</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapBtn} onPress={() => router.back()}>
                <Text style={styles.mapBtnText}>خريطة المستويات</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Lose Overlay */}
        {lost && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>💀</Text>
              <Text style={styles.resultTitle}>انتهت اللعبة</Text>
              <Text style={styles.resultSub}>الشريط ممتلئ!</Text>
              <TouchableOpacity style={styles.nextBtn} onPress={startLevel} testID="retry-btn">
                <Text style={styles.nextBtnText}>إعادة المحاولة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapBtn} onPress={() => router.back()}>
                <Text style={styles.mapBtnText}>خريطة المستويات</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10,5,25,0.75)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2d1b4ecc',
    borderWidth: 1,
    borderColor: '#f5a62366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#f5e6d3',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  coinsBadge: {
    backgroundColor: '#2d1b4ecc',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#f5a62366',
  },
  coinsText: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  coinPopup: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#f5a623',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 6,
    zIndex: 999,
  },
  coinPopupText: {
    color: '#1a0e2e',
    fontWeight: '900',
    fontSize: 20,
  },
  gridScroll: {
    flex: 1,
    marginHorizontal: 8,
  },
  gridContent: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  gridContainer: {
    backgroundColor: 'rgba(30,15,60,0.7)',
    padding: 8,
    borderWidth: 1,
    borderColor: '#4a307066',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,25,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: '#2d1b4e',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f5a623',
    width: SCREEN_WIDTH * 0.8,
  },
  resultEmoji: { fontSize: 56, marginBottom: 12 },
  resultTitle: {
    color: '#f5e6d3',
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  resultSub: {
    color: '#9b8ec4',
    fontSize: 16,
    marginBottom: 24,
  },
  nextBtn: {
    backgroundColor: '#f5a623',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextBtnText: {
    color: '#1a0e2e',
    fontWeight: '800',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  mapBtn: {
    borderWidth: 1.5,
    borderColor: '#f5a62366',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 11,
    width: '100%',
    alignItems: 'center',
  },
  mapBtnText: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 15,
  },
});
