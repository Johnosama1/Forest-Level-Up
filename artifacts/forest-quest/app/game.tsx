import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  Platform,
  Alert,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BG = require('../assets/images/forest_bg.jpg');

const HEADER_H = 56;
const SKILLS_H = 78;
const TRAY_H = 82;
const BOARD_MARGIN = 12;
const CELL_GAP = 3;

export default function GameScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const currentLevel = parseInt(level || '1', 10);
  const insets = useSafeAreaInsets();
  const { gameState, updateCoins, unlockLevel, updateSkills } = useGame();

  const [board, setBoard] = useState<GameBoard>([]);
  const [tray, setTray] = useState<Tile[]>([]);
  const [skillGreen, setSkillGreen] = useState(gameState.skillGreen);
  const [skillRed, setSkillRed] = useState(gameState.skillRed);
  const [skillPurple, setSkillPurple] = useState(gameState.skillPurple);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [coinPopup, setCoinPopup] = useState<string | null>(null);
  const [winCountdown, setWinCountdown] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);

  const topPad = Platform.OS === 'web' ? 40 : insets.top;
  const botPad = Platform.OS === 'web' ? 20 : insets.bottom;

  // Calculate tile size so the full 7×5 board fits on screen without overflow
  const BOARD_PADDING = 16; // board internal padding (8 each side)
  const EXTRA_MARGIN = 20;  // safety buffer
  const availH = SCREEN_HEIGHT - topPad - botPad - HEADER_H - SKILLS_H - TRAY_H - BOARD_MARGIN * 2 - BOARD_PADDING - EXTRA_MARGIN;
  const availW = SCREEN_WIDTH - BOARD_MARGIN * 2 - BOARD_PADDING;
  const tileSizeByH = Math.floor((availH - (BOARD_ROWS - 1) * CELL_GAP) / BOARD_ROWS);
  const tileSizeByW = Math.floor((availW - (BOARD_COLS - 1) * CELL_GAP) / BOARD_COLS);
  const tileSize = Math.min(tileSizeByH, tileSizeByW, 58);

  useEffect(() => {
    setSkillGreen(gameState.skillGreen);
    setSkillRed(gameState.skillRed);
    setSkillPurple(gameState.skillPurple);
  }, []);

  useEffect(() => {
    startLevel();
  }, [currentLevel]);

  // Auto-navigate home after winning
  useEffect(() => {
    if (!won) return;
    setWinCountdown(2);
    const interval = setInterval(() => {
      setWinCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          router.back();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [won]);

  useEffect(() => {
    updateSkills(skillGreen, skillRed, skillPurple);
  }, [skillGreen, skillRed, skillPurple]);

  const startLevel = useCallback(() => {
    const newBoard = generateBoard(currentLevel);
    setBoard(newBoard);
    setTray([]);
    setWon(false);
    setLost(false);
    setShowExitDialog(false);
  }, [currentLevel]);

  const showCoinPopup = (text: string) => {
    setCoinPopup(text);
    setTimeout(() => setCoinPopup(null), 1200);
  };

  // Insert into tray: same symbols grouped adjacent
  const insertIntoTray = useCallback((currentTray: Tile[], newTile: Tile): Tile[] => {
    let insertIdx = -1;
    for (let i = currentTray.length - 1; i >= 0; i--) {
      if (currentTray[i].symbol === newTile.symbol) {
        insertIdx = i + 1;
        break;
      }
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

    // Remove top tile from that cell's stack
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => ri === row && ci === col ? s.slice(1) : [...s])
    );

    const newTray = insertIntoTray(tray, topTile);
    const matchCount = newTray.filter(t => t.symbol === topTile.symbol).length;

    if (matchCount >= 3) {
      const afterMatch = removeMatchFromTray(newTray, topTile.symbol);
      updateCoins(100);
      showCoinPopup('+100 🪙');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBoard(newBoard);
      setTray(afterMatch);
      if (isBoardEmpty(newBoard) && afterMatch.length === 0) {
        setTimeout(() => { setWon(true); unlockLevel(currentLevel + 1); }, 300);
      }
    } else if (newTray.length >= 7) {
      setBoard(newBoard);
      setTray(newTray);
      setTimeout(() => {
        setLost(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 300);
    } else {
      setBoard(newBoard);
      setTray(newTray);
      if (isBoardEmpty(newBoard) && newTray.length === 0) {
        setTimeout(() => { setWon(true); unlockLevel(currentLevel + 1); }, 300);
      }
    }
  }, [board, tray, won, lost, currentLevel, insertIntoTray]);

  // GREEN: auto-complete a pair in tray using a board tile
  const handleGreenSkill = useCallback(() => {
    if (skillGreen <= 0) return;
    const twin = hasTwinsInTray(tray);
    if (!twin) {
      Alert.alert('مهارة خضراء', 'تحتاج لاثنين من نفس الشكل في الشريط أولاً');
      return;
    }
    const { symbol } = twin;
    let foundRow = -1, foundCol = -1;
    outer: for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (board[r]?.[c]?.[0]?.symbol === symbol) {
          foundRow = r; foundCol = c;
          break outer;
        }
      }
    }
    if (foundRow === -1) {
      Alert.alert('مهارة خضراء', 'لا يوجد هذا الشكل في اللوح');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const boardTile = board[foundRow][foundCol][0];
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) => ri === foundRow && ci === foundCol ? s.slice(1) : [...s])
    );
    const newTray = insertIntoTray(tray, boardTile);
    const symCount = newTray.filter(t => t.symbol === symbol).length;
    if (symCount >= 3) {
      const afterMatch = removeMatchFromTray(newTray, symbol);
      updateCoins(100);
      showCoinPopup('+100 🪙');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTray(afterMatch);
      setBoard(newBoard);
      if (isBoardEmpty(newBoard) && afterMatch.length === 0) {
        setTimeout(() => { setWon(true); unlockLevel(currentLevel + 1); }, 300);
      }
    } else {
      setTray(newTray);
      setBoard(newBoard);
    }
    setSkillGreen(prev => prev - 1);
  }, [skillGreen, tray, board, currentLevel, insertIntoTray]);

  // RED: put last tray tile back on its original cell (top of stack)
  const handleRedSkill = useCallback(() => {
    if (skillRed <= 0 || tray.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const lastTile = tray[tray.length - 1];
    const newTray = tray.slice(0, -1);
    const newBoard: GameBoard = board.map((r, ri) =>
      r.map((s, ci) =>
        ri === lastTile.row && ci === lastTile.col ? [lastTile, ...s] : [...s]
      )
    );
    setTray(newTray);
    setBoard(newBoard);
    setSkillRed(prev => prev - 1);
  }, [skillRed, tray, board]);

  // PURPLE: shuffle symbols among top tiles only (positions stay)
  const handlePurpleSkill = useCallback(() => {
    if (skillPurple <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Collect all top tiles
    const topTiles: { row: number; col: number; tile: Tile }[] = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (board[r]?.[c]?.length > 0) {
          topTiles.push({ row: r, col: c, tile: board[r][c][0] });
        }
      }
    }
    // Shuffle their positions
    const shuffledPositions = shuffle(topTiles.map(t => ({ row: t.row, col: t.col })));
    const newBoard: GameBoard = board.map(r => r.map(s => [...s]));
    topTiles.forEach((item, i) => {
      const newPos = shuffledPositions[i];
      // Move this tile to newPos
      newBoard[newPos.row][newPos.col][0] = { ...item.tile, row: newPos.row, col: newPos.col };
    });
    // Restore original positions with shuffled tiles
    const shuffledTiles = shuffle(topTiles.map(t => t.tile));
    topTiles.forEach((item, i) => {
      newBoard[item.row][item.col][0] = { ...shuffledTiles[i], row: item.row, col: item.col };
    });
    setBoard(newBoard);
    setSkillPurple(prev => prev - 1);
  }, [skillPurple, board]);

  const handleExit = () => setShowExitDialog(true);

  // Count remaining tiles for progress display
  const remaining = useMemo(() =>
    board.reduce((sum, row) => sum + row.reduce((s, stack) => s + stack.length, 0), 0),
    [board]
  );

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleExit} style={styles.exitBtn} testID="exit-btn">
            <Feather name="x" size={20} color="#f5a623" />
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

        {/* Fixed Game Board — no scroll, all in one screen */}
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
                      onPress={() => handleCellPress(row, col)}
                      disabled={won || lost || depth === 0}
                      style={[
                        styles.cell,
                        {
                          width: tileSize,
                          height: tileSize,
                          borderRadius: tileSize * 0.14,
                        },
                        depth === 0 && styles.cellEmpty,
                      ]}
                    >
                      {depth > 0 && (
                        <>
                          {/* Depth shadows behind the tile */}
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
                          {/* Top tile */}
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

        {/* Skills Bar */}
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
        <TrayBar tray={tray} />

        {/* Win Overlay */}
        {won && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🏆</Text>
              <Text style={styles.resultTitle}>رائع! فزت!</Text>
              <Text style={styles.resultSub}>المستوى {currentLevel} مكتمل</Text>
              <View style={styles.countdownWrap}>
                <Text style={styles.countdownText}>العودة للخريطة خلال {winCountdown}...</Text>
              </View>
              <TouchableOpacity style={styles.nextBtn} onPress={() => router.back()}>
                <Text style={styles.nextBtnText}>العودة الآن ←</Text>
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

        {/* Exit Dialog */}
        {showExitDialog && (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <Text style={styles.resultEmoji}>🚪</Text>
              <Text style={styles.resultTitle}>الخروج من اللعبة؟</Text>
              <Text style={styles.resultSub}>سيتم فقدان تقدمك في هذا المستوى</Text>
              <TouchableOpacity
                style={styles.nextBtn}
                onPress={() => { setShowExitDialog(false); router.back(); }}
              >
                <Text style={styles.nextBtnText}>نعم، اخرج</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapBtn} onPress={() => setShowExitDialog(false)}>
                <Text style={styles.mapBtnText}>لا، استمر</Text>
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
    backgroundColor: 'rgba(10,5,25,0.72)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    height: HEADER_H,
  },
  exitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2d1b4ecc',
    borderWidth: 1,
    borderColor: '#f5a62366',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelText: {
    color: '#f5e6d3',
    fontSize: 17,
    fontWeight: '700',
  },
  coinsBadge: {
    backgroundColor: '#2d1b4ecc',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#f5a62366',
  },
  coinsText: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 13,
  },
  coinPopup: {
    position: 'absolute',
    top: 90,
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
    fontSize: 18,
  },
  boardWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: BOARD_MARGIN,
  },
  board: {
    backgroundColor: 'rgba(20,10,45,0.6)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#4a307055',
  },
  boardRow: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
  cell: {
    marginRight: CELL_GAP,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  cellEmpty: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  depthLayer2: {
    position: 'absolute',
    backgroundColor: 'rgba(100,60,180,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.2)',
    top: 6,
    left: 6,
  },
  depthLayer1: {
    position: 'absolute',
    backgroundColor: 'rgba(100,60,180,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(245,166,35,0.3)',
    top: 3,
    left: 3,
  },
  stackBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#f5a623',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    zIndex: 10,
  },
  stackBadgeText: {
    color: '#1a0e2e',
    fontSize: 9,
    fontWeight: '900',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,5,25,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  resultCard: {
    backgroundColor: '#2d1b4e',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f5a623',
    width: SCREEN_WIDTH * 0.82,
  },
  resultEmoji: { fontSize: 52, marginBottom: 10 },
  resultTitle: {
    color: '#f5e6d3',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  resultSub: {
    color: '#9b8ec4',
    fontSize: 15,
    marginBottom: 20,
  },
  countdownWrap: {
    backgroundColor: 'rgba(245,166,35,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f5a62355',
  },
  countdownText: {
    color: '#f5a623',
    fontSize: 13,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: '#f5a623',
    borderRadius: 13,
    paddingHorizontal: 24,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextBtnText: {
    color: '#1a0e2e',
    fontWeight: '800',
    fontSize: 15,
  },
  mapBtn: {
    borderWidth: 1.5,
    borderColor: '#f5a62355',
    borderRadius: 13,
    paddingHorizontal: 24,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
  },
  mapBtnText: {
    color: '#f5a623',
    fontWeight: '700',
    fontSize: 14,
  },
});
