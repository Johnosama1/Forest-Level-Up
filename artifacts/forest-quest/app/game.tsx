import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '@/context/GameContext';
import { Tile } from '@/context/GameContext';

import {
  generateBoard,
  GameBoard,
  BOARD_ROWS,
  BOARD_COLS,
  isBoardEmpty,
  hasTwinsInTray,
  shuffle,
} from '@/utils/gameLogic';
import TileComponent from '@/components/TileComponent';
import TrayBar from '@/components/TrayBar';
import SkillsBar from '@/components/SkillsBar';
import TutorialOverlay from '@/components/TutorialOverlay';
import AnimatedTrees from '@/components/AnimatedTrees';
import { useForestAmbient } from '@/hooks/useForestAmbient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = require('../assets/images/forest_bg.jpg');

// Filler images for empty cells — cycling per position (not interactive)
const FILLER_IMAGES = [
  require('../assets/tiles/pear.png'),
  require('../assets/tiles/grape.png'),
  require('../assets/tiles/orange.png'),
];
const FILLER_COLORS = ['#8bc34a', '#9c27b0', '#ff7043'];

const SKILL_COST = 200;
const CONTINUE_COST = 1000;

const HEADER_H = 56;
const SKILLS_H = 88;
const TRAY_H   = 82;
const BOARD_MARGIN = 12;
const CELL_GAP = 3;

// ── Skill purchase popup state ───────────────────────────
type SkillType = 'green' | 'red' | 'purple';
interface SkillDef {
  key: SkillType;
  label: string;
  desc: string;
  icon: string;
  color: string;
}
const SKILL_DEFS: Record<SkillType, SkillDef> = {
  green:  { key: 'green',  label: 'مهارة المساعد',  desc: 'تُكمل زوجاً في الشريط تلقائياً',    icon: 'plus-circle', color: '#4caf50' },
  red:    { key: 'red',    label: 'مهارة التراجع',  desc: 'ترجع آخر قطعة إلى اللوح',           icon: 'rotate-ccw', color: '#e07030' },
  purple: { key: 'purple', label: 'مهارة الخلط',    desc: 'تخلط مواضع القطع على اللوح',         icon: 'shuffle',     color: '#9c27b0' },
};

export default function GameScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const currentLevel = parseInt(level || '1', 10);
  const insets = useSafeAreaInsets();
  const { gameState, updateCoins, unlockLevel } = useGame();

  const [board, setBoard]           = useState<GameBoard>([]);
  const [tray, setTray]             = useState<Tile[]>([]);
  // Each level always starts fresh with 3 charges per skill
  const [skillGreen, setSkillGreen]   = useState(3);
  const [skillRed, setSkillRed]       = useState(3);
  const [skillPurple, setSkillPurple] = useState(3);

  const [trayHistory, setTrayHistory]   = useState<string[]>([]); // tile IDs in add order
  const [won, setWon]                   = useState(false);
  const [lost, setLost]                 = useState(false);
  const [coinPopup, setCoinPopup]       = useState<string | null>(null);
  const [winCountdown, setWinCountdown] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  // Show tutorial on level 1 only
  const [showTutorial,  setShowTutorial]  = useState(currentLevel === 1);

  // Ambient forest sound — driven by profile.soundEnabled
  const { profile } = useGame();
  useForestAmbient(profile.soundEnabled);

  // ── Skill purchase popup ──────────────────────────────
  const [skillPopup, setSkillPopup]   = useState<SkillType | null>(null);
  const [watchingAd, setWatchingAd]   = useState(false);
  const [adProgress, setAdProgress]   = useState(0);
  const [notEnoughCoins, setNotEnoughCoins] = useState(false);
  const popupScale = useRef(new Animated.Value(0)).current;
  const exitScale  = useRef(new Animated.Value(0)).current;
  const lostScale  = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 40 : insets.top;
  const botPad = Platform.OS === 'web' ? 20 : insets.bottom;

  const availH = SCREEN_HEIGHT - topPad - botPad - HEADER_H - SKILLS_H - TRAY_H - BOARD_MARGIN * 2 - 24;
  const availW = SCREEN_WIDTH - BOARD_MARGIN * 2 - 16;
  const tileSizeByH = Math.floor((availH - (BOARD_ROWS - 1) * CELL_GAP) / BOARD_ROWS);
  const tileSizeByW = Math.floor((availW - (BOARD_COLS - 1) * CELL_GAP) / BOARD_COLS);
  const tileSize = Math.min(tileSizeByH, tileSizeByW, 58);

  const useNative = Platform.OS !== 'web';

  useEffect(() => { startLevel(); }, [currentLevel]);

  // Skill popup appear animation
  useEffect(() => {
    if (skillPopup) {
      Animated.spring(popupScale, {
        toValue: 1, useNativeDriver: useNative, bounciness: 10,
      }).start();
    } else {
      popupScale.setValue(0);
    }
  }, [skillPopup]);

  // Exit dialog appear animation
  useEffect(() => {
    if (showExitDialog) {
      exitScale.setValue(0);
      Animated.spring(exitScale, {
        toValue: 1, useNativeDriver: useNative, bounciness: 12, speed: 14,
      }).start();
    }
  }, [showExitDialog]);

  // Lost popup appear animation
  useEffect(() => {
    if (lost) {
      lostScale.setValue(0);
      Animated.spring(lostScale, {
        toValue: 1, useNativeDriver: useNative, bounciness: 14, speed: 12,
      }).start();
    }
  }, [lost]);

  // Auto-navigate home after winning
  useEffect(() => {
    if (!won) return;
    setWinCountdown(2);
    const interval = setInterval(() => {
      setWinCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); router.back(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [won]);

  const startLevel = useCallback(() => {
    setBoard(generateBoard(currentLevel));
    setTray([]);
    setTrayHistory([]);
    setWon(false);
    setLost(false);
    setShowExitDialog(false);
    setSkillGreen(3);
    setSkillRed(3);
    setSkillPurple(3);
    setSkillPopup(null);
  }, [currentLevel]);

  // Return the last 3 tiles from tray back to their original board positions
  const continueLevel = useCallback(() => {
    // Identify last 3 tile IDs added to tray
    const last3Ids = new Set(trayHistory.slice(-3));

    const tilesToReturn: Tile[] = [];
    const remainingTray: Tile[] = [];
    // Preserve original tray order for the remaining tiles
    tray.forEach(t => {
      if (last3Ids.has(t.id) && tilesToReturn.length < 3) {
        tilesToReturn.push(t);
      } else {
        remainingTray.push(t);
      }
    });

    // Put tiles back on top of their original board stacks
    setBoard(prev => {
      const next: GameBoard = prev.map(r => r.map(s => [...s]));
      tilesToReturn.forEach(t => {
        next[t.row][t.col] = [{ ...t }, ...next[t.row][t.col]];
      });
      return next;
    });

    setTray(remainingTray);
    setTrayHistory(prev => prev.slice(0, -3));
    setLost(false);
  }, [tray, trayHistory]);

  const showCoinPopup = (text: string) => {
    setCoinPopup(text);
    setTimeout(() => setCoinPopup(null), 1200);
  };

  const insertIntoTray = useCallback((currentTray: Tile[], newTile: Tile): Tile[] => {
    let insertIdx = -1;
    for (let i = currentTray.length - 1; i >= 0; i--) {
      if (currentTray[i].symbol === newTile.symbol) { insertIdx = i + 1; break; }
    }
    if (insertIdx === -1) return [...currentTray, newTile];
    return [...currentTray.slice(0, insertIdx), newTile, ...currentTray.slice(insertIdx)];
  }, []);

  const removeMatchFromTray = (currentTray: Tile[], sym: string): Tile[] => {
    let removed = 0;
    return currentTray.filter(t => {
      if (t.symbol === sym && removed < 3) { removed++; return false; }
      return true;
    });
  };

  const handleCellPress = useCallback((row: number, col: number) => {
    if (won || lost) return;
    const stack = board[row]?.[col];
    if (!stack || stack.length === 0) return;

    const topTile = stack[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => ri === row && ci === col ? s.slice(1) : [...s])
    );
    const newTray    = insertIntoTray(tray, topTile);
    const newHistory = [...trayHistory, topTile.id];
    const matchCnt   = newTray.filter(t => t.symbol === topTile.symbol).length;

    if (matchCnt >= 3) {
      // Identify exactly the 3 matched tile IDs to remove from history
      let cnt = 0;
      const matchedIds = new Set<string>();
      for (const t of newTray) {
        if (t.symbol === topTile.symbol && cnt < 3) { matchedIds.add(t.id); cnt++; }
      }
      const afterMatch   = newTray.filter(t => !matchedIds.has(t.id));
      const afterHistory = newHistory.filter(id => !matchedIds.has(id));

      updateCoins(20);
      showCoinPopup('+20 🪙');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBoard(newBoard);
      setTray(afterMatch);
      setTrayHistory(afterHistory);
      if (isBoardEmpty(newBoard) && afterMatch.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    } else if (newTray.length >= 7) {
      setBoard(newBoard);
      setTray(newTray);
      setTrayHistory(newHistory);
      setLost(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      setBoard(newBoard);
      setTray(newTray);
      setTrayHistory(newHistory);
      if (isBoardEmpty(newBoard) && newTray.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    }
  }, [board, tray, trayHistory, won, lost, currentLevel, insertIntoTray]);

  // ── Skill execution helpers ───────────────────────────
  const execGreen = useCallback(() => {
    const twin = hasTwinsInTray(tray);
    if (!twin) return;
    const { symbol } = twin;
    let fRow = -1, fCol = -1;
    outer: for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (board[r]?.[c]?.[0]?.symbol === symbol) { fRow = r; fCol = c; break outer; }
      }
    }
    if (fRow === -1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const boardTile = board[fRow][fCol][0];
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => ri === fRow && ci === fCol ? s.slice(1) : [...s])
    );
    const newTray = insertIntoTray(tray, boardTile);
    const cnt = newTray.filter(t => t.symbol === symbol).length;
    if (cnt >= 3) {
      const afterMatch = removeMatchFromTray(newTray, symbol);
      updateCoins(20); showCoinPopup('+20 🪙');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTray(afterMatch); setBoard(newBoard);
      if (isBoardEmpty(newBoard) && afterMatch.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    } else {
      setTray(newTray); setBoard(newBoard);
    }
    setSkillGreen(p => p - 1);
  }, [skillGreen, tray, board, currentLevel, insertIntoTray]);

  const execRed = useCallback(() => {
    if (tray.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lastTile = tray[tray.length - 1];
    const newTray  = tray.slice(0, -1);
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => ri === lastTile.row && ci === lastTile.col ? [lastTile, ...s] : [...s])
    );
    setTray(newTray); setBoard(newBoard);
    setSkillRed(p => p - 1);
  }, [skillRed, tray, board]);

  const execPurple = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const topTiles: { row: number; col: number; tile: Tile }[] = [];
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++)
        if (board[r]?.[c]?.length > 0) topTiles.push({ row: r, col: c, tile: board[r][c][0] });
    const shuffledTiles = shuffle(topTiles.map(t => t.tile));
    const newBoard: GameBoard = board.map(r => r.map(s => [...s]));
    topTiles.forEach((item, i) => {
      newBoard[item.row][item.col][0] = { ...shuffledTiles[i], row: item.row, col: item.col };
    });
    setBoard(newBoard);
    setSkillPurple(p => p - 1);
  }, [skillPurple, board]);

  // ── Skill press handler (routes to exec or purchase popup) ────
  const handleSkillPress = useCallback((type: SkillType) => {
    const count = type === 'green' ? skillGreen : type === 'red' ? skillRed : skillPurple;
    if (count > 0) {
      if (type === 'green')  execGreen();
      if (type === 'red')    execRed();
      if (type === 'purple') execPurple();
    } else {
      // Open the purchase popup
      setNotEnoughCoins(false);
      setWatchingAd(false);
      setAdProgress(0);
      setSkillPopup(type);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [skillGreen, skillRed, skillPurple, execGreen, execRed, execPurple]);

  // ── Purchase actions ──────────────────────────────────
  const handleBuySkill = useCallback(() => {
    if (!skillPopup) return;
    if (gameState.coins < SKILL_COST) {
      setNotEnoughCoins(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setNotEnoughCoins(false), 2000);
      return;
    }
    updateCoins(-SKILL_COST);
    if (skillPopup === 'green')  setSkillGreen(p => p + 1);
    if (skillPopup === 'red')    setSkillRed(p => p + 1);
    if (skillPopup === 'purple') setSkillPurple(p => p + 1);
    showCoinPopup(`-${SKILL_COST} 🪙`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSkillPopup(null);
  }, [skillPopup, gameState.coins, updateCoins]);

  const handleWatchAd = useCallback(() => {
    if (!skillPopup || watchingAd) return;
    setWatchingAd(true);
    setAdProgress(0);
    // Simulate watching a 5-second rewarded video
    let elapsed = 0;
    const interval = setInterval(() => {
      elapsed++;
      setAdProgress(elapsed / 5);
      if (elapsed >= 5) {
        clearInterval(interval);
        const type = skillPopup;
        setWatchingAd(false);
        setSkillPopup(null);
        if (type === 'green')  setSkillGreen(p => p + 1);
        if (type === 'red')    setSkillRed(p => p + 1);
        if (type === 'purple') setSkillPurple(p => p + 1);
        showCoinPopup('🎬 +1 مهارة!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1000);
  }, [skillPopup, watchingAd]);

  const remaining = useMemo(() =>
    board.reduce((sum, row) => sum + row.reduce((s, stack) => s + stack.length, 0), 0),
    [board]
  );

  const skillDef = skillPopup ? SKILL_DEFS[skillPopup] : null;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <AnimatedTrees />
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => setShowExitDialog(true)}
              style={styles.exitBtn}
              testID="exit-btn"
              activeOpacity={0.75}
            >
              <View style={styles.exitBtnGlow} pointerEvents="none" />
              <Feather name="x" size={22} color="#ff6b6b" />
            </TouchableOpacity>
          </View>
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

        {/* ── Board ── */}
        <View style={styles.boardWrapper}>
          <View style={styles.board}>
            {Array.from({ length: BOARD_ROWS }).map((_, row) => (
              <View key={row} style={styles.boardRow}>
                {Array.from({ length: BOARD_COLS }).map((_, col) => {
                  const stack = board[row]?.[col] || [];
                  const topTile = stack[0];
                  const depth = stack.length;
                  return (
                    <TouchableOpacity
                      key={`${row}-${col}`}
                      activeOpacity={depth > 0 ? 0.7 : 1}
                      delayPressIn={0}
                      onPress={() => handleCellPress(row, col)}
                      disabled={won || lost || depth === 0}
                      style={[
                        styles.cell,
                        { width: tileSize, height: tileSize, borderRadius: tileSize * 0.14 },
                        depth === 0 && styles.cellEmpty,
                      ]}
                    >
                      {depth === 0 && (
                        <View style={[styles.fillerTile, {
                          width: tileSize, height: tileSize,
                          borderRadius: tileSize * 0.14,
                        }]} />
                      )}
                      {depth > 0 && (
                        <>
                          {depth >= 3 && (
                            <View style={[styles.depthLayer2, {
                              width: tileSize - 8, height: tileSize - 8,
                              borderRadius: tileSize * 0.12,
                            }]} />
                          )}
                          {depth >= 2 && (
                            <View style={[styles.depthLayer1, {
                              width: tileSize - 4, height: tileSize - 4,
                              borderRadius: tileSize * 0.13,
                            }]} />
                          )}
                          <TileComponent
                            tile={topTile}
                            size={tileSize}
                            onPress={() => handleCellPress(row, col)}
                            disabled={won || lost}
                          />
                        </>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* ── Skills Bar ── */}
        <SkillsBar
          greenCount={skillGreen}
          redCount={skillRed}
          purpleCount={skillPurple}
          onGreen={() => handleSkillPress('green')}
          onRed={() => handleSkillPress('red')}
          onPurple={() => handleSkillPress('purple')}
          redDisabled={tray.length === 0}
        />

        {/* ── Tray ── */}
        <TrayBar tray={tray} />

        {/* ══════════════ SKILL PURCHASE POPUP ══════════════ */}
        {skillPopup && skillDef && (
          <View style={styles.popupOverlay}>
            <Animated.View
              style={[
                styles.popupCard,
                { borderColor: skillDef.color, transform: [{ scale: popupScale }] },
              ]}
            >
              {/* Glow border top accent */}
              <View style={[styles.popupAccentBar, { backgroundColor: skillDef.color }]} />

              {/* Skill icon & name */}
              <View style={[styles.popupIconCircle, { backgroundColor: skillDef.color + '22', borderColor: skillDef.color }]}>
                <Feather name={skillDef.icon as any} size={32} color={skillDef.color} />
              </View>
              <Text style={[styles.popupTitle, { color: skillDef.color }]}>{skillDef.label}</Text>
              <Text style={styles.popupDesc}>{skillDef.desc}</Text>

              <View style={styles.popupDivider} />

              <Text style={styles.popupQuestion}>رصيدك الحالي: 🪙 {gameState.coins.toLocaleString()}</Text>

              {notEnoughCoins && (
                <View style={styles.errorBadge}>
                  <Feather name="alert-circle" size={13} color="#e53935" />
                  <Text style={styles.errorText}>عملاتك غير كافية!</Text>
                </View>
              )}

              {/* Buy button */}
              <TouchableOpacity
                style={[
                  styles.popupBtnBuy,
                  { borderColor: '#f5a623' },
                  gameState.coins < SKILL_COST && styles.popupBtnDisabled,
                ]}
                onPress={handleBuySkill}
                activeOpacity={0.8}
              >
                <Text style={styles.popupBtnBuyIcon}>🪙</Text>
                <Text style={styles.popupBtnBuyText}>شراء استخدام واحد · {SKILL_COST.toLocaleString()} عملة</Text>
              </TouchableOpacity>

              {/* Watch Video button */}
              <TouchableOpacity
                style={[styles.popupBtnVideo, watchingAd && styles.popupBtnWatching]}
                onPress={handleWatchAd}
                disabled={watchingAd}
                activeOpacity={0.8}
              >
                {watchingAd ? (
                  <View style={styles.adProgressRow}>
                    <Feather name="film" size={16} color="#fff" />
                    <Text style={styles.popupBtnVideoText}>جاري مشاهدة الإعلان…</Text>
                    <Text style={styles.adProgressPct}>{Math.round(adProgress * 100)}%</Text>
                  </View>
                ) : (
                  <>
                    <Feather name="play-circle" size={18} color="#fff" />
                    <Text style={styles.popupBtnVideoText}>شاهد فيديو واحصل على استخدام مجاني</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Ad progress bar */}
              {watchingAd && (
                <View style={styles.adBarBg}>
                  <Animated.View
                    style={[styles.adBarFill, { width: `${Math.round(adProgress * 100)}%` as any }]}
                  />
                </View>
              )}

              {/* Cancel */}
              {!watchingAd && (
                <TouchableOpacity style={styles.popupBtnCancel} onPress={() => setSkillPopup(null)}>
                  <Text style={styles.popupBtnCancelText}>إلغاء</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </View>
        )}

        {/* ── Win Overlay ── */}
        {won && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🏆</Text>
              <Text style={styles.resultTitle}>رائع! فزت!</Text>
              <Text style={styles.resultSub}>المستوى {currentLevel} مكتمل</Text>
              <View style={styles.countdownWrap}>
                <Text style={styles.countdownText}>العودة للخريطة خلال {winCountdown}…</Text>
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={() => router.back()}>
                <Text style={styles.nextBtnText}>العودة الآن ←</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Lose Overlay ── */}
        {lost && (
          <View style={styles.lostOverlay}>
            <Animated.View style={[styles.lostCard, { transform: [{ scale: lostScale }] }]}>
              {/* Gold accent bar at top */}
              <View style={styles.lostAccentBar} />

              {/* Icon */}
              <View style={styles.lostIconCircle}>
                <Text style={{ fontSize: 42 }}>💀</Text>
              </View>

              <Text style={styles.lostTitle}>الشريط ممتلئ!</Text>
              <Text style={styles.lostSub}>ادفع {CONTINUE_COST.toLocaleString()} عملة لإعادة آخر 3 قطع للوح</Text>

              <View style={styles.lostDivider} />

              {/* كمل الدور */}
              <TouchableOpacity
                style={[
                  styles.lostBtnContinue,
                  gameState.coins < CONTINUE_COST && styles.lostBtnDisabled,
                ]}
                activeOpacity={0.8}
                testID="continue-btn"
                onPress={() => {
                  if (gameState.coins < CONTINUE_COST) return;
                  updateCoins(-CONTINUE_COST);
                  continueLevel();
                }}
              >
                <Text style={styles.lostBtnContinueText}>
                  🔄 أعد آخر 3 قطع للوح · {CONTINUE_COST.toLocaleString()} عملة
                </Text>
                {gameState.coins < CONTINUE_COST && (
                  <Text style={styles.lostBtnNotEnough}>عملاتك غير كافية</Text>
                )}
              </TouchableOpacity>

              {/* خريطة المستويات */}
              <TouchableOpacity
                style={styles.lostBtnMap}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <Text style={styles.lostBtnMapText}>خريطة المستويات</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── Tutorial (level 1 only) ── */}
        {showTutorial && (
          <TutorialOverlay onDone={() => setShowTutorial(false)} />
        )}


        {/* ── Exit Dialog ── */}
        {showExitDialog && (
          <View style={styles.exitOverlay}>
            <Animated.View style={[styles.exitCard, { transform: [{ scale: exitScale }] }]}>
              {/* Red accent stripe */}
              <View style={styles.exitAccentBar} />

              {/* Icon */}
              <View style={styles.exitIconCircle}>
                <Feather name="log-out" size={34} color="#ff6b6b" />
              </View>

              <Text style={styles.exitTitle}>هل تريد الخروج من الدور؟</Text>
              <Text style={styles.exitSub}>سيضيع تقدمك في هذا المستوى</Text>

              <View style={styles.exitDivider} />

              {/* Buttons row */}
              <View style={styles.exitBtnRow}>
                {/* الخروج من الدور */}
                <TouchableOpacity
                  style={styles.exitBtnYes}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowExitDialog(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.back();
                  }}
                >
                  <Text style={styles.exitBtnYesText}>الخروج من الدور</Text>
                </TouchableOpacity>

                {/* لا الخروج من الدور */}
                <TouchableOpacity
                  style={styles.exitBtnNo}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowExitDialog(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.exitBtnNoText}>لا الخروج من الدور</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(8,4,22,0.76)' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: HEADER_H,
    zIndex: 50,
    backgroundColor: 'rgba(10,5,28,0.55)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,166,35,0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exitBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(40,10,30,0.9)',
    borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.5)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
    position: 'relative',
  },
  exitBtnGlow: {
    position: 'absolute',
    width: 46, height: 46, borderRadius: 14,
    borderWidth: 1, borderColor: '#ff6b6b22',
    top: -4, left: -4,
  },
  levelText: {
    color: '#f0e0b8',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(245,166,35,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  coinsBadge: {
    backgroundColor: 'rgba(30,18,60,0.9)',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1.5, borderColor: 'rgba(245,166,35,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  coinsText: { color: '#f5a623', fontWeight: '800', fontSize: 13 },

  // Coin popup
  coinPopup: {
    position: 'absolute', top: 90, alignSelf: 'center',
    backgroundColor: '#f5a623', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 6, zIndex: 999,
  },
  coinPopupText: { color: '#1a0e2e', fontWeight: '900', fontSize: 18 },

  // Board
  boardWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    marginHorizontal: BOARD_MARGIN,
  },
  board: {
    backgroundColor: 'rgba(12,6,30,0.75)',
    borderRadius: 22, padding: 10,
    borderWidth: 1.5, borderColor: 'rgba(120,60,200,0.35)',
    shadowColor: '#7a30cc',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  boardRow: { flexDirection: 'row', marginBottom: CELL_GAP },
  cell: {
    marginRight: CELL_GAP, alignItems: 'center', justifyContent: 'center', overflow: 'visible',
  },
  cellEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
  },
  fillerTile: {
    backgroundColor: 'transparent',
  },
  depthLayer2: {
    position: 'absolute',
    backgroundColor: 'rgba(80,40,160,0.30)',
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.15)',
    top: 5, left: 5,
  },
  depthLayer1: {
    position: 'absolute',
    backgroundColor: 'rgba(100,55,180,0.40)',
    borderWidth: 1, borderColor: 'rgba(245,166,35,0.25)',
    top: 2.5, left: 2.5,
  },

  // ── Skill purchase popup ──────────────────────────────
  popupOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,2,18,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  popupCard: {
    width: SCREEN_WIDTH * 0.88,
    backgroundColor: '#13092a',
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    paddingBottom: 20,
    overflow: 'hidden',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  popupAccentBar: {
    width: '100%', height: 4, marginBottom: 24,
  },
  popupIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: 12,
  },
  popupTitle: {
    fontSize: 20, fontWeight: '900', marginBottom: 4,
  },
  popupDesc: {
    color: '#9b8ec4', fontSize: 13, textAlign: 'center',
    paddingHorizontal: 20, marginBottom: 16,
  },
  popupDivider: {
    width: '85%', height: 1,
    backgroundColor: '#f5a62222',
    marginBottom: 12,
  },
  popupQuestion: {
    color: '#f5e6d3', fontSize: 14, fontWeight: '600',
    marginBottom: 6,
  },
  errorBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#e5393520',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: '#e5393544',
    marginBottom: 8,
  },
  errorText: { color: '#e53935', fontSize: 12, fontWeight: '700' },

  // Buy button
  popupBtnBuy: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '85%',
    backgroundColor: '#2a1800',
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  popupBtnBuyIcon: { fontSize: 18 },
  popupBtnBuyText: {
    color: '#f5a623', fontWeight: '800', fontSize: 14,
  },
  popupBtnDisabled: {
    opacity: 0.4,
  },

  // Watch video button
  popupBtnVideo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '85%',
    backgroundColor: '#1a3a2a',
    borderWidth: 2,
    borderColor: '#4caf50',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  popupBtnWatching: {
    backgroundColor: '#0e2a1a',
    borderColor: '#4caf5055',
  },
  popupBtnVideoText: {
    color: '#fff', fontWeight: '700', fontSize: 13,
  },
  adProgressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center',
  },
  adProgressPct: {
    color: '#4caf50', fontWeight: '900', fontSize: 14,
  },
  adBarBg: {
    width: '85%', height: 6, backgroundColor: '#1a1230',
    borderRadius: 3, marginBottom: 10, overflow: 'hidden',
  },
  adBarFill: {
    height: '100%', backgroundColor: '#4caf50', borderRadius: 3,
  },

  // Cancel button
  popupBtnCancel: {
    paddingVertical: 8, paddingHorizontal: 24,
  },
  popupBtnCancelText: {
    color: '#665599', fontSize: 14, fontWeight: '600',
  },

  // ── Result overlays ───────────────────────────────────
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,25,0.88)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: '#2d1b4e',
    borderRadius: 24, padding: 28, alignItems: 'center',
    borderWidth: 2, borderColor: '#f5a623',
    width: SCREEN_WIDTH * 0.82,
  },
  resultEmoji: { fontSize: 52, marginBottom: 10 },
  resultTitle: { color: '#f5e6d3', fontSize: 24, fontWeight: '800', marginBottom: 6 },
  resultSub:   { color: '#9b8ec4', fontSize: 15, marginBottom: 20 },
  countdownWrap: {
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 16, borderWidth: 1, borderColor: '#f5a62355',
  },
  countdownText: { color: '#f5a623', fontSize: 13, fontWeight: '600' },
  nextBtn: {
    backgroundColor: '#f5a623', borderRadius: 13,
    paddingHorizontal: 24, paddingVertical: 12,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  nextBtnText: { color: '#1a0e2e', fontWeight: '800', fontSize: 15 },
  mapBtn: {
    borderWidth: 1.5, borderColor: '#f5a62355',
    borderRadius: 13, paddingHorizontal: 24, paddingVertical: 10,
    width: '100%', alignItems: 'center',
  },
  mapBtnText: { color: '#f5a623', fontWeight: '700', fontSize: 14 },

  // ── Lose Overlay (انتهت الدور) ─────────────────────────
  lostOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,2,18,0.90)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 200,
  },
  lostCard: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: '#0e0a22',
    borderRadius: 26, borderWidth: 2,
    borderColor: '#f5a62355',
    alignItems: 'center',
    paddingBottom: 26,
    overflow: 'hidden',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 24,
  },
  lostAccentBar: {
    width: '100%', height: 4,
    backgroundColor: '#f5a623', marginBottom: 26,
  },
  lostIconCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#2a1600',
    borderWidth: 2, borderColor: '#f5a62355',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  lostTitle: {
    color: '#f5e6d3', fontSize: 24, fontWeight: '900',
    textAlign: 'center', marginBottom: 8,
  },
  lostSub: {
    color: '#7a6aaa', fontSize: 13, textAlign: 'center',
    marginBottom: 22, paddingHorizontal: 20,
  },
  lostDivider: {
    width: '80%', height: 1,
    backgroundColor: '#f5a62318', marginBottom: 22,
  },
  lostBtnContinue: {
    width: '88%',
    backgroundColor: '#c87d12',
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
  },
  lostBtnDisabled: {
    backgroundColor: '#2a1e0a',
    shadowOpacity: 0,
  },
  lostBtnContinueText: {
    color: '#fff', fontWeight: '900', fontSize: 15, textAlign: 'center',
  },
  lostBtnNotEnough: {
    color: '#ff8888', fontSize: 11, marginTop: 4, textAlign: 'center',
  },
  lostBtnMap: {
    width: '88%',
    backgroundColor: 'transparent',
    borderRadius: 16, borderWidth: 2,
    borderColor: '#f5a62344',
    paddingVertical: 14, alignItems: 'center',
  },
  lostBtnMapText: {
    color: '#f5a623', fontWeight: '800', fontSize: 15,
  },

  // ── Premium Exit Dialog ──────────────────────────────
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,2,18,0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  exitCard: {
    width: SCREEN_WIDTH * 0.84,
    backgroundColor: '#100820',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#ff6b6b55',
    alignItems: 'center',
    paddingBottom: 24,
    overflow: 'hidden',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  exitAccentBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#ff6b6b',
    marginBottom: 28,
  },
  exitIconCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: '#ff6b6b18',
    borderWidth: 2, borderColor: '#ff6b6b55',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  exitTitle: {
    color: '#f5e6d3',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  exitSub: {
    color: '#7a6aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  exitDivider: {
    width: '80%', height: 1,
    backgroundColor: '#ff6b6b18',
    marginBottom: 22,
  },
  exitBtnRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  exitBtnYes: {
    flex: 1,
    backgroundColor: '#ff6b6b',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  exitBtnYesText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  exitBtnNo: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#f5a62344',
    paddingVertical: 15,
    alignItems: 'center',
  },
  exitBtnNoText: {
    color: '#f5a623',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});
