import React, { useRef, useEffect, useCallback, memo } from 'react';
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

const { width: rawW, height: H } = Dimensions.get('window');
// Cap width so nodes stay within screen on any platform/orientation
const W = Math.min(rawW, 430);
const BG = require('../../assets/images/forest_bg.jpg');
const TOTAL = 1000;

// ── Layout constants ──────────────────────────────────────
const STEP_Y   = 68;   // vertical pixels between consecutive level centers
const PAD_BOT  = 120;  // bottom padding inside scroll content
const PAD_TOP  = 100;  // top padding inside scroll content
const CONTENT_H = (TOTAL - 1) * STEP_Y + PAD_BOT + PAD_TOP;

// Horizontal positions for the 3-column zigzag
const XL = W * 0.18;   // left column center
const XC = W * 0.50;   // center column center
const XR = W * 0.82;   // right column center

// Node sizes
const SZ      = 50;  // regular level
const SZ_MS   = 62;  // milestone every 10 levels
const SZ_BOSS = 76;  // boss levels: 100, 500, 1000

// ── Pure helpers (no React) ───────────────────────────────

function getSize(level: number): number {
  if (level === 100 || level === 500 || level === 1000) return SZ_BOSS;
  if (level % 10 === 0) return SZ_MS;
  return SZ;
}

function getArabic(level: number): string | null {
  const m: Record<number, string> = {
    1:    'الدور الأول',
    2:    'الدور الثاني',
    3:    'الدور الثالث',
    5:    'الدور الخامس',
    10:   'الدور العاشر',
    20:   'الدور العشرون',
    30:   'الدور الثلاثون',
    50:   'الدور الخمسون',
    100:  'الدور المائة',
    200:  'الدور المئتان',
    500:  'الدور الخمسمائة',
    1000: 'الدور الألف',
  };
  return m[level] ?? null;
}

// ── Precompute ALL positions outside React (module-level) ─
type P = { cx: number; cy: number };
const POS: P[] = new Array(TOTAL);

for (let level = 1; level <= TOTAL; level++) {
  const idx   = level - 1;
  const group = Math.floor(idx / 3);
  const slot  = idx % 3;          // 0 | 1 | 2 within the group
  const even  = group % 2 === 0;

  // Y: level 1 at bottom, level 1000 near top of content
  const yFromBot = idx * STEP_Y + PAD_BOT;
  const cy = CONTENT_H - yFromBot;

  // X: even groups go R→C→L, odd groups go L→C→R
  let cx: number;
  if (even) {
    cx = slot === 0 ? XR : slot === 1 ? XC : XL;
  } else {
    cx = slot === 0 ? XL : slot === 1 ? XC : XR;
  }
  POS[idx] = { cx, cy };
}

// ── Precompute path-line geometry (999 segments) ──────────
interface Seg { left: number; top: number; width: number; angle: string }
const SEGS: Seg[] = new Array(TOTAL - 1);

for (let i = 0; i < TOTAL - 1; i++) {
  const p1 = POS[i], p2 = POS[i + 1];
  const dx = p2.cx - p1.cx, dy = p2.cy - p1.cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  const mid_x = (p1.cx + p2.cx) / 2;
  const mid_y = (p1.cy + p2.cy) / 2;
  SEGS[i] = {
    left: mid_x - len / 2,
    top: mid_y - 4,
    width: len,
    angle: `${Math.atan2(dy, dx) * 180 / Math.PI}deg`,
  };
}

// ── LevelNode component ───────────────────────────────────
interface NodeProps {
  level: number;
  cx: number;
  cy: number;
  state: 'completed' | 'current' | 'locked';
  pulse: Animated.Value;
  onPress: (level: number) => void;
}

const LevelNode = memo(({ level, cx, cy, state, pulse, onPress }: NodeProps) => {
  const size  = getSize(level);
  const name  = getArabic(level);
  const isBoss = level === 100 || level === 500 || level === 1000;
  const isLeft   = cx < W * 0.35;
  const isRight  = cx > W * 0.65;

  return (
    <TouchableOpacity
      style={[styles.nodeWrap, { left: cx - size / 2, top: cy - size / 2, width: size, height: size }]}
      onPress={() => onPress(level)}
      disabled={state === 'locked'}
      activeOpacity={0.75}
    >
      {/* Animated glow ring — current level only */}
      {state === 'current' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glowRing,
            {
              width: size + 24, height: size + 24,
              borderRadius: (size + 24) / 2,
              left: -12, top: -12,
              transform: [{ scale: pulse }],
              opacity: pulse.interpolate({ inputRange: [0.92, 1.12], outputRange: [0.5, 1] }),
            },
          ]}
        />
      )}

      {/* Completed: softer glow ring */}
      {state === 'completed' && (
        <View pointerEvents="none" style={[
          styles.completedRing,
          { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2, left: -4, top: -4 }
        ]} />
      )}

      {/* Main circle */}
      <View style={[
        styles.node,
        { width: size, height: size, borderRadius: size / 2 },
        state === 'completed' && styles.nodeCompleted,
        state === 'current'   && styles.nodeCurrent,
        state === 'locked'    && styles.nodeLocked,
        isBoss                && styles.nodeBoss,
      ]}>
        {state === 'completed' && (
          <Feather name="check" size={size * 0.44} color="#fff" />
        )}
        {state === 'current' && (
          <Text style={[styles.currentNum, { fontSize: size * 0.3 }]}>{level}</Text>
        )}
        {state === 'locked' && (
          <Feather name="lock" size={size * 0.36} color="#3a3060" />
        )}
      </View>

      {/* Arabic label for notable levels */}
      {name && state !== 'locked' && (
        <View
          style={[
            styles.label,
            isLeft  && styles.labelRight,
            isRight && styles.labelLeft,
            !isLeft && !isRight && styles.labelAbove,
            isBoss && styles.labelBoss,
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.labelText, isBoss && styles.labelTextBoss]}>{name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Main Screen ───────────────────────────────────────────
export default function LevelMapScreen() {
  const { gameState } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 10 : insets.top;
  const botPad = Platform.OS === 'web' ? 16 : insets.bottom;

  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const unlocked = gameState.unlockedLevel;

  const useNative = Platform.OS !== 'web';

  // Pulsing glow for current level
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: useNative }),
        Animated.timing(pulse, { toValue: 0.92, duration: 900, useNativeDriver: useNative }),
      ])
    ).start();
  }, []);

  // Compute the scroll target for the current level
  const getScrollTarget = useCallback(() => {
    const { cy } = POS[unlocked - 1];
    return Math.max(0, Math.min(cy - H * 0.48, CONTENT_H - H));
  }, [unlocked]);

  // Also scroll when content size is known (first render)
  const onContentReady = useCallback((_w: number, h: number) => {
    if (unlocked === 1) {
      // Level 1 is at the very bottom — scroll to end
      scrollRef.current?.scrollToEnd({ animated: false });
    } else {
      scrollRef.current?.scrollTo({ y: getScrollTarget(), animated: false });
    }
  }, [unlocked, getScrollTarget]);

  // Auto-scroll so current level is centered when unlocked level changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (unlocked === 1) {
        scrollRef.current?.scrollToEnd({ animated: true });
      } else {
        scrollRef.current?.scrollTo({ y: getScrollTarget(), animated: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [unlocked, getScrollTarget]);

  const handlePress = useCallback((level: number) => {
    if (level > unlocked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({ pathname: '/game', params: { level } });
  }, [unlocked]);

  return (
    <ImageBackground source={BG} style={{ flex: 1 }} resizeMode="cover">

      {/* Dark atmospheric overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: 'rgba(4,2,16,0.60)' }} />
      </View>

      {/* ── Fixed Header ── */}
      <View style={[styles.header, { paddingTop: topPad + 6 }]}>
        <View style={styles.coinsBadge}>
          <Text style={styles.coinsLabel}>العملات الذهبية</Text>
          <Text style={styles.coinsValue}>🪙 {gameState.coins.toLocaleString()}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerHint}>اضغط على المستوى للعب</Text>
        </View>
      </View>

      {/* ── Scrollable Tower Map ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ height: CONTENT_H }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onContentSizeChange={onContentReady}
      >
        {/* Tower spine — central stone pillar */}
        <View
          pointerEvents="none"
          style={[styles.spine, { height: CONTENT_H }]}
        />

        {/* Path segments between consecutive levels */}
        {SEGS.map((seg, i) => {
          const fromLevel = i + 1;
          const isUnlocked = fromLevel + 1 <= unlocked;
          return (
            <View
              key={`seg${i}`}
              style={[
                styles.seg,
                { left: seg.left, top: seg.top, width: seg.width, transform: [{ rotate: seg.angle }] },
                isUnlocked ? styles.segUnlocked : styles.segLocked,
              ]}
            />
          );
        })}

        {/* Level nodes */}
        {POS.map(({ cx, cy }, idx) => {
          const level = idx + 1;
          const nodeState =
            level < unlocked  ? 'completed' :
            level === unlocked ? 'current'   : 'locked';
          return (
            <LevelNode
              key={`node${level}`}
              level={level}
              cx={cx}
              cy={cy}
              state={nodeState}
              pulse={pulse}
              onPress={handlePress}
            />
          );
        })}
      </ScrollView>

      {/* ── Bottom Play Bar ── */}
      <View style={[styles.playBar, { paddingBottom: botPad + 8 }]}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={() => handlePress(unlocked)}
          testID="play-current-btn"
          activeOpacity={0.85}
        >
          <Feather name="play" size={20} color="#1a0e2e" />
          <Text style={styles.playBtnText}>
            {getArabic(unlocked) ?? `الدور ${unlocked}`}
          </Text>
        </TouchableOpacity>
      </View>

    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    zIndex: 10,
  },
  coinsBadge: {
    backgroundColor: '#1e0e3eee',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#f5a62344',
  },
  coinsLabel: {
    color: '#9b8ec4',
    fontSize: 10,
    marginBottom: 2,
    textAlign: 'right',
  },
  coinsValue: {
    color: '#f5a623',
    fontSize: 18,
    fontWeight: '900',
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerHint: {
    color: '#9b8ec4',
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Tower spine
  spine: {
    position: 'absolute',
    left: W / 2 - 18,
    width: 36,
    top: 0,
    backgroundColor: 'rgba(60,30,100,0.22)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f5a62318',
  },

  // Path segments
  seg: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
  },
  segUnlocked: {
    backgroundColor: '#c87d12',
    opacity: 0.85,
  },
  segLocked: {
    backgroundColor: '#1a1230',
    opacity: 0.7,
  },

  // Node wrapper
  nodeWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },

  // Glow ring (current)
  glowRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: '#f5a623',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },

  // Completed ring
  completedRing: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4caf5055',
  },

  // Node base
  node: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  nodeCompleted: {
    backgroundColor: '#1b5e20',
    borderColor: '#66bb6a',
  },
  nodeCurrent: {
    backgroundColor: '#3d1f00',
    borderColor: '#f5a623',
  },
  nodeLocked: {
    backgroundColor: '#0d0a1e',
    borderColor: '#2a1f4a',
    opacity: 0.65,
  },
  nodeBoss: {
    borderWidth: 4,
    borderColor: '#ffd700',
    backgroundColor: '#2a1200',
  },

  // Text inside current node
  currentNum: {
    color: '#f5a623',
    fontWeight: '900',
  },

  // Arabic label
  label: {
    position: 'absolute',
    backgroundColor: '#1e0e3ecc',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#f5a62333',
    minWidth: 80,
    alignItems: 'center',
  },
  labelRight: {
    left: '110%',
    top: '15%',
  },
  labelLeft: {
    right: '110%',
    top: '15%',
  },
  labelAbove: {
    bottom: '115%',
    alignSelf: 'center',
  },
  labelBoss: {
    backgroundColor: '#2a1200dd',
    borderColor: '#ffd70055',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  labelText: {
    color: '#f5e6d3',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  labelTextBoss: {
    color: '#ffd700',
    fontSize: 12,
    fontWeight: '900',
  },

  // Bottom play bar
  playBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: 'rgba(10,5,30,0.85)',
    borderTopWidth: 1,
    borderTopColor: '#f5a62322',
  },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f5a623',
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  playBtnText: {
    color: '#1a0e2e',
    fontSize: 17,
    fontWeight: '900',
  },
});
