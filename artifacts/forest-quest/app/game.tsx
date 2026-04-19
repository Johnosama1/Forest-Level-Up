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
  PanResponder,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '@/context/GameContext';
import { Tile, TileSymbol } from '@/context/GameContext';

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
import RatingModal    from '@/components/RatingModal';
import AnimatedTrees from '@/components/AnimatedTrees';
import { useForestAmbient } from '@/hooks/useForestAmbient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = require('../assets/images/forest_bg.jpg');

const SKILL_COST = 200;
const CONTINUE_COST = 1000;

const HEADER_H = 56;
const SKILLS_H = 88;
const TRAY_H   = 100; // matches TrayBar actual render height (slot 68px + padding + margins)
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
  purple: { key: 'purple', label: 'مهارة الإنقاذ',  desc: 'تجلب قطعة مطابقة لرمز مكرر في الشريط وتضعها في الفتحة الخاصة',  icon: 'crosshair',  color: '#9c27b0' },
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
  const [targetSlotTile, setTargetSlotTile] = useState<Tile | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const targetSlotPulse = useRef(new Animated.Value(1)).current;

  // ── Drag & Drop ────────────────────────────────────────
  const [dragTile, setDragTile] = useState<{ tile: Tile; row: number; col: number } | null>(null);
  const dragPosX = useRef(new Animated.Value(0)).current;
  const dragPosY = useRef(new Animated.Value(0)).current;
  const trayYRef = useRef(0);
  const dragTileRef = useRef<{ tile: Tile; row: number; col: number } | null>(null);
  const handleCellPressRef = useRef<((row: number, col: number) => void) | null>(null);

  // Ambient forest sound — driven by profile.soundEnabled
  const { profile } = useGame();
  useForestAmbient(profile.soundEnabled);

  // ── Skill purchase popup ──────────────────────────────
  const [skillPopup, setSkillPopup]   = useState<SkillType | null>(null);
  const [watchingAd, setWatchingAd]   = useState(false);
  const [adProgress, setAdProgress]   = useState(0);
  const [notEnoughCoins, setNotEnoughCoins] = useState(false);
  const popupScale  = useRef(new Animated.Value(0)).current;
  const exitScale   = useRef(new Animated.Value(0)).current;
  const lostScale   = useRef(new Animated.Value(0)).current;
  const winScale    = useRef(new Animated.Value(0)).current;
  const matchBurst  = useRef(new Animated.Value(0)).current;
  const dropPulse   = useRef(new Animated.Value(0)).current;
  const starAnims   = useRef(Array.from({ length: 6 }, () => ({
    y:  new Animated.Value(0),
    op: new Animated.Value(0),
    x:  new Animated.Value(0),
  }))).current;
  const coinFloat   = useRef(new Animated.Value(0)).current;
  const coinOpacity = useRef(new Animated.Value(0)).current;
  const comboRef    = useRef(0);
  const [comboMsg, setComboMsg] = useState<string | null>(null);
  const comboAnim   = useRef(new Animated.Value(0)).current;
  const comboScale  = useRef(new Animated.Value(1)).current;

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

  // Win card pop-in + stars celebration
  useEffect(() => {
    if (!won) return;
    winScale.setValue(0);
    Animated.spring(winScale, {
      toValue: 1, useNativeDriver: useNative, bounciness: 18, speed: 9,
    }).start();
    // Launch 6 stars with staggered delays
    const xPositions = [-90, -50, 0, 40, 80, -20];
    starAnims.forEach((s, i) => {
      s.y.setValue(0);
      s.op.setValue(0);
      s.x.setValue(xPositions[i]);
      Animated.sequence([
        Animated.delay(i * 80),
        Animated.parallel([
          Animated.timing(s.y, { toValue: -160 - Math.random() * 60, duration: 900, useNativeDriver: useNative }),
          Animated.sequence([
            Animated.timing(s.op, { toValue: 1, duration: 200, useNativeDriver: useNative }),
            Animated.timing(s.op, { toValue: 0, duration: 600, useNativeDriver: useNative, delay: 200 }),
          ]),
        ]),
      ]).start();
    });
  }, [won]);

  // Combo badge animation
  useEffect(() => {
    if (comboMsg) {
      comboAnim.setValue(0);
      comboScale.setValue(0.5);
      Animated.parallel([
        Animated.spring(comboAnim, { toValue: 1, bounciness: 14, speed: 12, useNativeDriver: useNative }),
        Animated.spring(comboScale, { toValue: 1, bounciness: 16, speed: 14, useNativeDriver: useNative }),
      ]).start(() => {
        Animated.delay(700).start(() => {
          Animated.timing(comboAnim, { toValue: 0, duration: 300, useNativeDriver: useNative }).start();
        });
      });
    }
  }, [comboMsg]);

  // Coin popup float animation
  useEffect(() => {
    if (coinPopup) {
      coinFloat.setValue(0);
      coinOpacity.setValue(1);
      Animated.parallel([
        Animated.timing(coinFloat, { toValue: -50, duration: 1100, useNativeDriver: useNative }),
        Animated.sequence([
          Animated.delay(700),
          Animated.timing(coinOpacity, { toValue: 0, duration: 400, useNativeDriver: useNative }),
        ]),
      ]).start();
    }
  }, [coinPopup]);

  // Drop zone pulse animation while dragging
  // Must use useNativeDriver: false because backgroundColor/borderTopColor are not native-driver compatible
  useEffect(() => {
    if (dragTile) {
      dropPulse.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(dropPulse, { toValue: 1, duration: 650, useNativeDriver: false }),
          Animated.timing(dropPulse, { toValue: 0, duration: 650, useNativeDriver: false }),
        ])
      ).start();
    } else {
      dropPulse.stopAnimation();
      dropPulse.setValue(0);
    }
  }, [!!dragTile]);

  // Keep drag tile ref in sync with latest value
  useEffect(() => { dragTileRef.current = dragTile; }, [dragTile]);

  // PanResponder for the drag overlay — created once, reads via refs
  const dragOverlayPR = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (e) => {
        dragPosX.setValue(e.nativeEvent.pageX);
        dragPosY.setValue(e.nativeEvent.pageY);
      },
      onPanResponderRelease: (e) => {
        const info = dragTileRef.current;
        const dropY = e.nativeEvent.pageY;
        // Use measured tray position if available, otherwise bottom 30% of screen
        const threshold = trayYRef.current > 0 ? trayYRef.current - 60 : SCREEN_HEIGHT * 0.65;
        if (info && dropY >= threshold && handleCellPressRef.current) {
          handleCellPressRef.current(info.row, info.col);
        }
        setDragTile(null);
      },
      onPanResponderTerminate: () => setDragTile(null),
    })
  ).current;

  // Auto-navigate after winning
  useEffect(() => {
    if (!won) return;
    // Level 5: show rating modal first, then user taps "Next" manually
    if (currentLevel === 5) {
      // Small delay so the win overlay animates in before modal pops
      const t = setTimeout(() => setShowRatingModal(true), 800);
      return () => clearTimeout(t);
    }
    setWinCountdown(2);
    const interval = setInterval(() => {
      setWinCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); router.back(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [won]);

  const insertIntoTray = useCallback((currentTray: Tile[], newTile: Tile): Tile[] => {
    let insertIdx = -1;
    for (let i = currentTray.length - 1; i >= 0; i--) {
      if (currentTray[i].symbol === newTile.symbol) { insertIdx = i + 1; break; }
    }
    if (insertIdx === -1) return [...currentTray, newTile];
    return [...currentTray.slice(0, insertIdx), newTile, ...currentTray.slice(insertIdx)];
  }, []);

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
    setTargetSlotTile(null);
    targetSlotPulse.stopAnimation();
    targetSlotPulse.setValue(1);
  }, [currentLevel, targetSlotPulse]);

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

  const removeMatchFromTray = (currentTray: Tile[], sym: string): Tile[] => {
    let removed = 0;
    return currentTray.filter(t => {
      if (t.symbol === sym && removed < 3) { removed++; return false; }
      return true;
    });
  };

  const handleLongPress = useCallback((row: number, col: number, pageX: number, pageY: number) => {
    if (won || lost) return;
    const stack = board[row]?.[col];
    if (!stack || stack.length === 0) return;
    setDragTile({ tile: stack[0], row, col });
    dragPosX.setValue(pageX);
    dragPosY.setValue(pageY);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [won, lost, board, dragPosX, dragPosY]);

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

      comboRef.current += 1;
      const combo = comboRef.current;
      const coinBonus = 10;
      updateCoins(coinBonus);
      showCoinPopup(`+${coinBonus} 🪙`);
      if (combo >= 2) {
        setComboMsg(
          combo === 2 ? '🔥 كومبو x2!' :
          combo === 3 ? '💥 كومبو x3!' :
          `⚡ كومبو x${combo} رائع!`
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Match burst animation
      matchBurst.setValue(0);
      Animated.sequence([
        Animated.timing(matchBurst, { toValue: 1, duration: 220, useNativeDriver: useNative }),
        Animated.timing(matchBurst, { toValue: 0, duration: 350, useNativeDriver: useNative }),
      ]).start();
      setBoard(newBoard);
      setTray(afterMatch);
      setTrayHistory(afterHistory);
      if (isBoardEmpty(newBoard) && afterMatch.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    } else if (newTray.length >= 7) {
      comboRef.current = 0;
      setBoard(newBoard);
      setTray(newTray);
      setTrayHistory(newHistory);
      setLost(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      comboRef.current = 0;
      setBoard(newBoard);
      setTray(newTray);
      setTrayHistory(newHistory);
      if (isBoardEmpty(newBoard) && newTray.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    }
  }, [board, tray, trayHistory, won, lost, currentLevel, insertIntoTray]);
  // Keep the PanResponder ref in sync — must be after handleCellPress is defined
  handleCellPressRef.current = handleCellPress;

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
      updateCoins(10); showCoinPopup('+10 🪙');
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

    // ── Find the first duplicate symbol in the tray ───────
    const trayCounts: Record<string, number> = {};
    for (const t of tray) {
      trayCounts[t.symbol] = (trayCounts[t.symbol] || 0) + 1;
    }
    const dupEntry = Object.entries(trayCounts).find(([, cnt]) => cnt >= 2);
    if (!dupEntry) return; // no duplicate — do nothing

    const targetSymbol = dupEntry[0] as TileSymbol;

    // ── Find ONE matching tile on the board (any depth) ───
    let foundRow = -1, foundCol = -1, foundDepth = -1;
    outer: for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const stack = board[r][c];
        for (let d = 0; d < stack.length; d++) {
          if (stack[d].symbol === targetSymbol) {
            foundRow = r; foundCol = c; foundDepth = d;
            break outer;
          }
        }
      }
    }
    if (foundRow === -1) return; // symbol not on board

    // ── Remove that one tile from the board ───────────────
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => {
        if (ri === foundRow && ci === foundCol) {
          return [...s.slice(0, foundDepth), ...s.slice(foundDepth + 1)];
        }
        return [...s];
      })
    );

    // ── Place it in the target slot ───────────────────────
    setBoard(newBoard);
    setTargetSlotTile(board[foundRow][foundCol][foundDepth]);
    setSkillPurple(p => p - 1);

    // Start pulse animation on the slot
    targetSlotPulse.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(targetSlotPulse, { toValue: 1.12, duration: 500, useNativeDriver: useNative }),
        Animated.timing(targetSlotPulse, { toValue: 1,    duration: 500, useNativeDriver: useNative }),
      ])
    ).start();
  }, [skillPurple, board, tray, targetSlotPulse]);

  // Tap the target slot → send tile to tray
  const handleTargetSlotTap = useCallback(() => {
    if (!targetSlotTile) return;
    if (tray.length >= 7) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    targetSlotPulse.stopAnimation();
    targetSlotPulse.setValue(1);

    const newTray    = insertIntoTray(tray, targetSlotTile);
    const newHistory = [...trayHistory, targetSlotTile.id];
    const sym        = targetSlotTile.symbol;
    const matchCnt   = newTray.filter(t => t.symbol === sym).length;

    setTargetSlotTile(null);

    if (matchCnt >= 3) {
      const matchedIds = new Set<string>();
      let cnt = 0;
      for (const t of newTray) { if (t.symbol === sym && cnt < 3) { matchedIds.add(t.id); cnt++; } }
      const cleanTray    = newTray.filter(t => !matchedIds.has(t.id));
      const cleanHistory = newHistory.filter(id => !matchedIds.has(id));
      updateCoins(10); showCoinPopup('+10 🪙');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTray(cleanTray); setTrayHistory(cleanHistory);
      if (isBoardEmpty(board) && cleanTray.length === 0) {
        setWon(true); unlockLevel(currentLevel + 1);
      }
    } else {
      setTray(newTray); setTrayHistory(newHistory);
      if (newTray.length >= 7) {
        setLost(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [targetSlotTile, tray, trayHistory, board, currentLevel, insertIntoTray, targetSlotPulse, updateCoins, unlockLevel]);

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

        {/* Combo badge */}
        {comboMsg && (
          <Animated.View
            style={[
              styles.comboBadge,
              {
                opacity: comboAnim,
                transform: [{ scale: comboScale }],
              },
            ]}
          >
            <Text style={styles.comboText}>{comboMsg}</Text>
          </Animated.View>
        )}

        {/* Coin popup — floats upward */}
        {coinPopup && (
          <Animated.View
            style={[
              styles.coinPopup,
              {
                opacity: coinOpacity,
                transform: [{ translateY: coinFloat }],
                pointerEvents: 'none',
              },
            ]}
          >
            <Text style={styles.coinPopupText}>{coinPopup}</Text>
          </Animated.View>
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
                      onLongPress={(e) => handleLongPress(row, col, e.nativeEvent.pageX, e.nativeEvent.pageY)}
                      delayLongPress={300}
                      disabled={won || lost || depth === 0}
                      style={[
                        styles.cell,
                        { width: tileSize, height: tileSize, borderRadius: tileSize * 0.14 },
                        depth === 0 && styles.cellEmpty,
                      ]}
                    >
                      {/* empty cell — fully transparent, nothing rendered */}
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
                            highlighted={
                              dragTile?.row === row && dragTile?.col === col
                            }
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

        {/* ── Target Slot (purple skill result) ── */}
        {targetSlotTile && (
          <View style={styles.targetSlotRow}>
            <Text style={styles.targetSlotLabel}>اضغط لإضافة للشريط ↓</Text>
            <Animated.View style={{ transform: [{ scale: targetSlotPulse }] }}>
              <TouchableOpacity
                onPress={handleTargetSlotTap}
                activeOpacity={0.8}
                style={styles.targetSlotCell}
              >
                <TileComponent
                  tile={targetSlotTile}
                  size={54}
                  onPress={handleTargetSlotTap}
                  disabled={false}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        {/* ── Tray ── */}
        <View
          onLayout={(e) => {
            try {
              if (typeof (e.target as any)?.measure === 'function') {
                (e.target as any).measure((_x: number, _y: number, _w: number, _h: number, _px: number, py: number) => {
                  if (typeof py === 'number') trayYRef.current = py;
                });
              }
            } catch {}
          }}
        >
          <TrayBar tray={tray} />
        </View>

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
            {/* Floating stars */}
            {starAnims.map((s, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.starFloat,
                  {
                    opacity: s.op,
                    transform: [
                      { translateX: s.x },
                      { translateY: s.y },
                    ],
                    pointerEvents: 'none',
                  },
                ]}
              >
                {['⭐', '✨', '🌟', '💫', '⭐', '🌟'][i]}
              </Animated.Text>
            ))}
            <Animated.View style={[styles.resultCard, { transform: [{ scale: winScale }] }]}>
              {/* Gold top bar */}
              <View style={styles.winAccentBar} />
              <Text style={styles.resultEmoji}>🏆</Text>
              <Text style={styles.resultTitle}>رائع! فزت!</Text>
              <Text style={styles.resultSub}>المستوى {currentLevel} مكتمل</Text>
              {/* Stars row */}
              <View style={styles.winStarsRow}>
                {[1, 2, 3].map(n => (
                  <Text key={n} style={styles.winStar}>⭐</Text>
                ))}
              </View>

              {currentLevel === 5 ? (
                /* Level 5: manual "next level" button — no countdown */
                <TouchableOpacity
                  style={styles.nextBtn}
                  onPress={() => router.replace({ pathname: '/game', params: { level: '6' } })}
                >
                  <Text style={styles.nextBtnText}>المستوى التالي ←</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={styles.countdownWrap}>
                    <Text style={styles.countdownText}>العودة للخريطة خلال {winCountdown}…</Text>
                  </View>
                  <TouchableOpacity style={styles.nextBtn} onPress={() => router.back()}>
                    <Text style={styles.nextBtnText}>العودة الآن ←</Text>
                  </TouchableOpacity>
                </>
              )}
            </Animated.View>
          </View>
        )}

        {/* ── Match Burst Ring ── */}
        <Animated.View
          style={[
            styles.matchBurstRing,
            {
              opacity: matchBurst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.85, 0] }),
              transform: [{ scale: matchBurst.interpolate({ inputRange: [0, 1], outputRange: [0.2, 2.2] }) }],
              pointerEvents: 'none',
            },
          ]}
        />

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

        {/* ── Rating Modal (Level 5 win) ── */}
        <RatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
        />

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
        {/* ── Drag & Drop Overlay ── */}
        {dragTile && (
          <Animated.View
            style={styles.dragOverlay}
            {...dragOverlayPR.panHandlers}
          >
            {/* Drop zone hint on the tray area — pulses while dragging */}
            <Animated.View
              style={[
                styles.dropZoneHint,
                {
                  backgroundColor: dropPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(100,220,100,0.08)', 'rgba(100,220,100,0.28)'],
                  }),
                  borderTopColor: dropPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(100,220,100,0.35)', 'rgba(100,220,100,0.9)'],
                  }),
                },
              ]}
            />

            {/* Floating dragged tile */}
            <Animated.View
              style={[
                styles.floatingTile,
                {
                  transform: [
                    { translateX: Animated.subtract(dragPosX, tileSize / 2) },
                    { translateY: Animated.subtract(dragPosY, tileSize / 2) },
                  ],
                  width: tileSize + 8,
                  height: tileSize + 8,
                  pointerEvents: 'none',
                },
              ]}
            >
              <TileComponent
                tile={dragTile.tile}
                size={tileSize + 8}
                onPress={() => {}}
                disabled
                animate={false}
                highlighted
              />
            </Animated.View>

            {/* Drag tip */}
            <View style={styles.dragTip} pointerEvents="none">
              <Text style={styles.dragTipText}>↓ اسحب نحو الشريط لإضافة القطعة</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(8,4,22,0.28)' },

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
  comboBadge: {
    position: 'absolute', top: 65, alignSelf: 'center',
    backgroundColor: '#9c27b0', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 7,
    zIndex: 998,
    borderWidth: 2, borderColor: '#e040fb',
    shadowColor: '#e040fb', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  comboText: { color: '#fff', fontWeight: '900', fontSize: 15, textAlign: 'center' },
  coinPopup: {
    position: 'absolute', top: 110, alignSelf: 'center',
    backgroundColor: '#f5a623', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 6, zIndex: 999,
  },
  coinPopupText: { color: '#1a0e2e', fontWeight: '900', fontSize: 18 },

  // Board
  boardWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start',
    marginHorizontal: BOARD_MARGIN,
    paddingTop: 6,
  },
  board: {
    backgroundColor: 'transparent',
    padding: 4,
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

  // ── Drag & Drop ───────────────────────────────────────
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 500,
  },
  dropZoneHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(100,220,100,0.12)',
    borderTopWidth: 2,
    borderTopColor: 'rgba(100,220,100,0.5)',
  },
  floatingTile: {
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
    opacity: 0.92,
  },
  dragTip: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
    backgroundColor: 'rgba(20,10,45,0.85)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(100,220,100,0.4)',
  },
  dragTipText: {
    color: '#7ddf90',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
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
  resultSub:   { color: '#9b8ec4', fontSize: 15, marginBottom: 12 },
  winAccentBar: {
    width: '100%', height: 5, backgroundColor: '#f5a623',
    borderRadius: 4, marginBottom: 16,
  },
  winStarsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  winStar: { fontSize: 28 },
  targetSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  targetSlotLabel: {
    color: '#c9a0f0',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  targetSlotCell: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: '#9c27b0',
    backgroundColor: 'rgba(156,39,176,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9c27b0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  starFloat: {
    position: 'absolute',
    fontSize: 24,
    top: SCREEN_HEIGHT * 0.5 - 12,
    alignSelf: 'center',
  },
  matchBurstRing: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#f5a623',
    backgroundColor: 'rgba(245,166,35,0.15)',
    zIndex: 90,
  },
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
