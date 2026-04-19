import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useGame } from '@/context/GameContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ProfilePanel({ visible, onClose }: Props) {
  const { profile, gameState, updateUsername, toggleSound, resetGame } = useGame();
  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState(profile.username);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const scale = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setNameInput(profile.username);
      setEditingName(false);
      setShowResetConfirm(false);
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 10,
      }).start();
    }
  }, [visible]);

  function saveName() {
    const trimmed = nameInput.trim();
    if (trimmed.length > 0) updateUsername(trimmed);
    setEditingName(false);
  }

  function confirmReset() {
    resetGame();
    setShowResetConfirm(false);
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.panel, { transform: [{ scale }] }]}>
          {/* Header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>الملف الشخصي</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeX}>
              <Feather name="x" size={20} color="#aaa" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatar + Identity */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Feather name="user" size={30} color="#e8d5a3" />
              </View>

              {/* Username */}
              <View style={styles.identityBlock}>
                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      value={nameInput}
                      onChangeText={setNameInput}
                      style={styles.nameInput}
                      autoFocus
                      maxLength={20}
                      returnKeyType="done"
                      onSubmitEditing={saveName}
                      placeholderTextColor="#888"
                    />
                    <TouchableOpacity style={styles.saveBtn} onPress={saveName}>
                      <Feather name="check" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.nameRow} onPress={() => setEditingName(true)}>
                    <Text style={styles.username}>{profile.username}</Text>
                    <Feather name="edit-2" size={13} color="#8bc34a" style={{ marginRight: 6 }} />
                  </TouchableOpacity>
                )}
                <Text style={styles.playerId}>{profile.playerId}</Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>🪙 {gameState.coins.toLocaleString()}</Text>
                <Text style={styles.statLabel}>العملات</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>🏆 {gameState.unlockedLevel}</Text>
                <Text style={styles.statLabel}>أعلى مستوى</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Sound Toggle */}
            <TouchableOpacity style={styles.row} onPress={toggleSound} activeOpacity={0.8}>
              <View style={styles.rowLeft}>
                <Feather
                  name={profile.soundEnabled ? 'volume-2' : 'volume-x'}
                  size={20}
                  color={profile.soundEnabled ? '#8bc34a' : '#e53935'}
                />
                <Text style={styles.rowLabel}>الصوت</Text>
              </View>
              <View style={[styles.soundToggle, { backgroundColor: profile.soundEnabled ? '#8bc34a' : '#e53935' }]}>
                <Text style={styles.soundToggleText}>
                  {profile.soundEnabled ? 'تشغيل' : 'إيقاف'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Reset Game */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => setShowResetConfirm(true)}
              activeOpacity={0.8}
            >
              <Feather name="refresh-ccw" size={16} color="#e53935" />
              <Text style={styles.resetText}>إعادة اللعبة من الصفر</Text>
            </TouchableOpacity>

            <Text style={styles.resetNote}>
              سيتم حذف كل التقدم والعملات
            </Text>
          </ScrollView>
        </Animated.View>
      </View>

      {/* ── Reset Confirmation Dialog ── */}
      <Modal
        transparent
        animationType="fade"
        visible={showResetConfirm}
        onRequestClose={() => setShowResetConfirm(false)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Feather name="alert-triangle" size={32} color="#e53935" />
            </View>
            <Text style={styles.confirmTitle}>إعادة اللعبة من الصفر</Text>
            <Text style={styles.confirmMsg}>هل تريد إعادة اللعبة من الصفر؟</Text>
            <Text style={styles.confirmWarn}>سيتم حذف كل التقدم والعملات نهائياً</Text>

            <TouchableOpacity
              style={styles.confirmYesBtn}
              onPress={confirmReset}
              activeOpacity={0.85}
            >
              <Feather name="refresh-ccw" size={16} color="#fff" />
              <Text style={styles.confirmYesText}>نعم، أعد اللعبة من الصفر</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmNoBtn}
              onPress={() => setShowResetConfirm(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmNoText}>لا، أريد الاستمرار في اللعبة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

/* ── Profile Avatar Button (small widget) ─────────────────────── */
interface AvatarBtnProps {
  onPress: () => void;
}
export function ProfileAvatarBtn({ onPress }: AvatarBtnProps) {
  const { profile } = useGame();
  return (
    <TouchableOpacity style={styles.avatarBtn} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatarBtnCircle}>
        <Feather name="user" size={18} color="#e8d5a3" />
      </View>
      <View style={[styles.soundDotSmall, { backgroundColor: profile.soundEnabled ? '#8bc34a' : '#e53935' }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centeredWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  panel: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1a0f2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4a2070',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  panelTitle: {
    color: '#e8d5a3',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  closeX: {
    padding: 4,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4a2070',
    borderWidth: 2,
    borderColor: '#8bc34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#e8d5a3',
    fontSize: 22,
    fontWeight: '700',
  },
  identityBlock: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  playerId: {
    color: '#7a6a9a',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  nameInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#8bc34a',
    paddingBottom: 4,
    textAlign: 'right',
  },
  saveBtn: {
    backgroundColor: '#8bc34a',
    borderRadius: 8,
    padding: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    color: '#e8d5a3',
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    color: '#ccc',
    fontSize: 15,
  },
  soundToggle: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  soundToggleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e53935',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  resetText: {
    color: '#e53935',
    fontSize: 14,
    fontWeight: '600',
  },
  resetNote: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 6,
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1a0f2e',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e5393555',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#e53935',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(229,57,53,0.12)',
    borderWidth: 1.5,
    borderColor: '#e5393555',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    color: '#f0e0b8',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmMsg: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 6,
  },
  confirmWarn: {
    color: '#e5393599',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmYesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: '#e53935',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 10,
  },
  confirmYesText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmNoBtn: {
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmNoText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  // Avatar button (small widget near X)
  avatarBtn: {
    position: 'relative',
  },
  avatarBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a1545',
    borderWidth: 1.5,
    borderColor: '#8bc34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtnText: {
    color: '#e8d5a3',
    fontSize: 13,
    fontWeight: '700',
  },
  soundDotSmall: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#1a0f2e',
  },
});
