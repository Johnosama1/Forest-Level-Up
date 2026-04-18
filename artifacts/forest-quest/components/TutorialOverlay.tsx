import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

const { width: W } = Dimensions.get('window');

interface Step {
  icon: string;
  iconColor: string;
  title: string;
  body: string;
  emoji?: string;
}

const STEPS: Step[] = [
  {
    icon: 'star',
    iconColor: '#f5a623',
    emoji: '🌲',
    title: 'مرحباً في Forest Quest!',
    body: 'سنعلمك كيف تلعب في 5 خطوات سهلة. هذا المستوى الأول تجريبي فقط.',
  },
  {
    icon: 'mouse-pointer',
    iconColor: '#4caf50',
    emoji: '👆',
    title: 'كيف تلعب',
    body: 'اضغط على أي قطعة في اللوح لتنزل إلى شريط الانتظار أسفل اللوح.',
  },
  {
    icon: 'check-circle',
    iconColor: '#f5a623',
    emoji: '🪙',
    title: 'اجمع 3 متشابهة',
    body: 'عندما تجمع 3 قطع متشابهة في الشريط تختفي تلقائياً وتكسب 20 عملة!',
  },
  {
    icon: 'alert-triangle',
    iconColor: '#ff6b6b',
    emoji: '⚠️',
    title: 'انتبه من الشريط!',
    body: 'الشريط يتسع لـ 7 قطع فقط. إذا امتلأ بقطع مختلفة — ستخسر الدور.',
  },
  {
    icon: 'zap',
    iconColor: '#9c27b0',
    emoji: '✨',
    title: 'المهارات الثلاث',
    body:
      '🟢 المساعد: يُكمل الثلاثة تلقائياً\n' +
      '🔴 التراجع: يُرجع آخر قطعة للوح\n' +
      '🟣 الخلط: يخلط مواضع القطع على اللوح\n\n' +
      'كل مهارة بـ 200 عملة عند الحاجة.',
  },
];

interface Props {
  onDone: () => void;
}

export default function TutorialOverlay({ onDone }: Props) {
  const [step, setStep] = React.useState(0);
  const cardScale = useRef(new Animated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  useEffect(() => {
    cardScale.setValue(0);
    Animated.spring(cardScale, {
      toValue: 1,
      useNativeDriver: useNative,
      bounciness: 13,
      speed: 14,
    }).start();
  }, [step]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) { onDone(); return; }
    setStep(s => s + 1);
  };

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>

        {/* Gold accent bar */}
        <View style={styles.accentBar} />

        {/* Step dots */}
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>

        {/* Icon circle */}
        <View style={[styles.iconCircle, { borderColor: current.iconColor + '55', backgroundColor: current.iconColor + '18' }]}>
          {current.emoji ? (
            <Text style={styles.emoji}>{current.emoji}</Text>
          ) : (
            <Feather name={current.icon as any} size={34} color={current.iconColor} />
          )}
        </View>

        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.body}>{current.body}</Text>

        <View style={styles.divider} />

        {/* Button */}
        <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={next}>
          <Text style={styles.btnText}>
            {isLast ? 'ابدأ اللعب! 🌲' : 'التالي'}
          </Text>
          {!isLast && <Feather name="chevron-left" size={18} color="#1a0e2e" />}
        </TouchableOpacity>

      </Animated.View>
    </View>
  );
}

const CARD_W = Math.min(W, 430) * 0.88;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,2,18,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 300,
  },
  card: {
    width: CARD_W,
    backgroundColor: '#100820',
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#f5a62355',
    alignItems: 'center',
    paddingBottom: 26,
    overflow: 'hidden',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 22,
  },
  accentBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#f5a623',
    marginBottom: 18,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#2a1e4a',
    borderWidth: 1, borderColor: '#f5a62333',
  },
  dotActive: {
    backgroundColor: '#f5a623',
    borderColor: '#f5a623',
    width: 20,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 18,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  emoji: {
    fontSize: 40,
  },
  title: {
    color: '#f5e6d3',
    fontSize: 21, fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  body: {
    color: '#9b8ec4',
    fontSize: 14.5, textAlign: 'center',
    paddingHorizontal: 22,
    lineHeight: 22,
    marginBottom: 24,
  },
  divider: {
    width: '80%', height: 1,
    backgroundColor: '#f5a62318',
    marginBottom: 22,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '88%',
    backgroundColor: '#f5a623',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
  },
  btnText: {
    color: '#1a0e2e',
    fontWeight: '900',
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
