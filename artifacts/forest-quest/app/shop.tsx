import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '@/context/GameContext';

const BG = require('../assets/images/forest_bg.jpg');

export default function ShopScreen() {
  const { gameState, buySkill } = useGame();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleBuy = (type: 'green' | 'red' | 'purple', name: string) => {
    if (gameState.coins < 1000) {
      Alert.alert('عملات غير كافية', `تحتاج 1000 عملة لشراء ${name}`);
      return;
    }
    Alert.alert(
      'شراء مهارة',
      `هل تريد شراء ${name} مقابل 1000 عملة؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'شراء',
          onPress: () => {
            const success = buySkill(type);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          },
        },
      ]
    );
  };

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#f5a623" />
          </TouchableOpacity>
          <Text style={styles.title}>متجر المهارات</Text>
          <View style={styles.coinsBadge}>
            <Text style={styles.coinsText}>🪙 {gameState.coins.toLocaleString()}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>كل مهارة بـ 1000 عملة ذهبية</Text>

          <ShopItem
            color="#4caf50"
            title="المهارة الخضراء"
            description="تكمل لك الشكل الناقص في الشريط وتجلب القطعة الثالثة من اللوح"
            icon="plus-circle"
            count={gameState.skillGreen}
            onBuy={() => handleBuy('green', 'المهارة الخضراء')}
            canAfford={gameState.coins >= 1000}
          />

          <ShopItem
            color="#e53935"
            title="المهارة الحمراء"
            description="تُرجع آخر قطعة وضعتها في الشريط إلى اللوح"
            icon="rotate-ccw"
            count={gameState.skillRed}
            onBuy={() => handleBuy('red', 'المهارة الحمراء')}
            canAfford={gameState.coins >= 1000}
          />

          <ShopItem
            color="#9c27b0"
            title="المهارة الموف"
            description="تخلط الأشكال في اللوح وتساعدك بإضافة قطعة مفيدة لو عندك زوج في الشريط"
            icon="shuffle"
            count={gameState.skillPurple}
            onBuy={() => handleBuy('purple', 'المهارة الموف')}
            canAfford={gameState.coins >= 1000}
          />

          <View style={styles.tip}>
            <Text style={styles.tipText}>💡 تحصل على 100 عملة كل ما تجمع 3 أشكال متشابهة</Text>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

interface ShopItemProps {
  color: string;
  title: string;
  description: string;
  icon: string;
  count: number;
  onBuy: () => void;
  canAfford: boolean;
}

function ShopItem({ color, title, description, icon, count, onBuy, canAfford }: ShopItemProps) {
  return (
    <View style={[styles.card, { borderColor: color + '66' }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Feather name={icon as any} size={30} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
        <Text style={[styles.cardCount, { color }]}>لديك: {count}</Text>
      </View>
      <TouchableOpacity
        style={[styles.buyBtn, { backgroundColor: canAfford ? color : '#444', opacity: canAfford ? 1 : 0.5 }]}
        onPress={onBuy}
        testID={`buy-${icon}`}
      >
        <Text style={styles.buyBtnText}>1000🪙</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(10,5,25,0.8)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#2d1b4ecc',
    borderWidth: 1, borderColor: '#f5a62366',
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: '#f5e6d3',
    fontSize: 20,
    fontWeight: '800',
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
  },
  content: { padding: 16, gap: 16 },
  subtitle: {
    color: '#9b8ec4',
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d1b4ecc',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    color: '#f5e6d3',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  cardDesc: {
    color: '#9b8ec4',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 4,
  },
  cardCount: { fontSize: 13, fontWeight: '600' },
  buyBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  tip: {
    backgroundColor: '#f5a62322',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f5a62344',
    marginTop: 8,
  },
  tipText: {
    color: '#f5a623',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
