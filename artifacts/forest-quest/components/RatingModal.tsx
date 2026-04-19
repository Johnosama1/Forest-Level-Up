import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.forestquest';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function RatingModal({ visible, onClose }: Props) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const useNative = Platform.OS !== 'web';

  React.useEffect(() => {
    if (visible) {
      setStars(0);
      setComment('');
      setSubmitted(false);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: useNative,
          bounciness: 12,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: useNative,
        }),
      ]).start();
    } else {
      scale.setValue(0);
      opacity.setValue(0);
    }
  }, [visible]);

  async function handleSubmit() {
    if (stars >= 4) {
      try {
        const supported = await Linking.canOpenURL(PLAY_STORE_URL);
        if (supported) await Linking.openURL(PLAY_STORE_URL);
      } catch (_) {}
    }
    setSubmitted(true);
    setTimeout(() => onClose(), 1200);
  }

  return (
    <Modal
      transparent
      animationType="none"
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <Animated.View style={[styles.card, { transform: [{ scale }] }]}>

            {/* ── Header ── */}
            <Text style={styles.title}>🎮 ما رأيك في اللعبة؟</Text>
            <Text style={styles.msg}>أنت لاعب رائع ووصلت إلى المستوى 5 👏</Text>
            <Text style={styles.sub}>
              إذا كنت تستمتع باللعبة، ادعمنا بتقييم 5 نجوم ⭐⭐⭐⭐⭐
            </Text>

            {/* ── Stars ── */}
            {submitted ? (
              <View style={styles.thanksWrap}>
                <Text style={styles.thanksText}>شكراً لك! 🌟</Text>
              </View>
            ) : (
              <>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity
                      key={n}
                      onPress={() => setStars(n)}
                      activeOpacity={0.75}
                      style={styles.starBtn}
                    >
                      <Text style={[styles.star, n <= stars && styles.starActive]}>
                        ★
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* ── Comment ── */}
                <TextInput
                  style={styles.input}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="اكتب هنا..."
                  placeholderTextColor="#bbb"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  textAlign="right"
                />

                {/* ── Submit ── */}
                <TouchableOpacity
                  style={[styles.submitBtn, stars === 0 && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  activeOpacity={stars === 0 ? 1 : 0.85}
                  disabled={stars === 0}
                >
                  <Text style={styles.submitText}>إرسال</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Close link ── */}
            {!submitted && (
              <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>تخطي</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kav: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 10,
  },
  msg: {
    fontSize: 15,
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  sub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  star: {
    fontSize: 40,
    color: '#ddd',
  },
  starActive: {
    color: '#f5a623',
  },
  input: {
    width: '100%',
    minHeight: 80,
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e8e8e8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 18,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4caf50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  skipText: {
    color: '#aaa',
    fontSize: 13,
  },
  thanksWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  thanksText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f5a623',
  },
});
