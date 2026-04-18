import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  PanResponder,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Tile, TileSymbol } from '../context/GameContext';
import { SYMBOL_COLORS } from '../utils/gameLogic';
import TileComponent from './TileComponent';

const { width: SW } = Dimensions.get('window');

export interface InventoryEntry {
  symbol: TileSymbol;
  count: number;
}

interface Props {
  inventory: InventoryEntry[];
  onUseItem: (symbol: TileSymbol) => void;
  onClose: () => void;
  visible: boolean;
}

export default function InventoryPanel({ inventory, onUseItem, onClose, visible }: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const [selected, setSelected] = useState<TileSymbol | null>(null);

  React.useEffect(() => {
    if (visible) {
      scale.setValue(0);
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 10,
      }).start();
    } else {
      setSelected(null);
    }
  }, [visible]);

  const totalItems = inventory.reduce((s, e) => s + e.count, 0);

  function handleUse(sym: TileSymbol) {
    onUseItem(sym);
    onClose();
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.centeredWrapper} pointerEvents="box-none">
        <Animated.View style={[styles.panel, { transform: [{ scale }] }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.bagIcon}>🎒</Text>
              <Text style={styles.title}>الحقيبة</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{totalItems}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={18} color="#aaa" />
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>اضغط على قطعة لإرسالها إلى الشريط السفلي</Text>

          {inventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>الحقيبة فارغة</Text>
              <Text style={styles.emptySubText}>القطع المكتسبة من المهارات ستظهر هنا</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.grid}
            >
              {inventory.map((entry) => {
                const color = SYMBOL_COLORS[entry.symbol] || '#8bc34a';
                const isSelected = selected === entry.symbol;
                const fakeTile: Tile = {
                  id: `inv-${entry.symbol}`,
                  symbol: entry.symbol,
                  row: 0,
                  col: 0,
                };
                return (
                  <TouchableOpacity
                    key={entry.symbol}
                    style={[
                      styles.itemCard,
                      { borderColor: isSelected ? color : color + '55' },
                      isSelected && { backgroundColor: color + '22' },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setSelected(isSelected ? null : entry.symbol)}
                  >
                    <TileComponent
                      tile={fakeTile}
                      size={54}
                      onPress={() => setSelected(isSelected ? null : entry.symbol)}
                      disabled={false}
                    />
                    <View style={[styles.countCircle, { backgroundColor: color }]}>
                      <Text style={styles.countText}>{entry.count}</Text>
                    </View>

                    {isSelected && (
                      <TouchableOpacity
                        style={[styles.useBtn, { backgroundColor: color }]}
                        onPress={() => handleUse(entry.symbol)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.useBtnText}>أرسل للشريط</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

/* ── Inventory Bag Button ──────────────────────────── */
interface BagBtnProps {
  count: number;
  onPress: () => void;
}
export function InventoryBagBtn({ count, onPress }: BagBtnProps) {
  return (
    <TouchableOpacity style={styles.bagBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.bagBtnIcon}>🎒</Text>
      {count > 0 && (
        <View style={styles.bagBtnBadge}>
          <Text style={styles.bagBtnBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  centeredWrapper: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: SW * 0.88,
    maxHeight: '82%',
    backgroundColor: '#13092a',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#f5a62355',
    overflow: 'hidden',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245,166,35,0.15)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bagIcon: { fontSize: 22 },
  title: {
    color: '#f0e0b8',
    fontSize: 18,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#f5a623',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: '#1a0e2e',
    fontSize: 12,
    fontWeight: '900',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: '#8a7baa',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: {
    color: '#c0aee0',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubText: {
    color: '#6b5e8a',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    justifyContent: 'flex-start',
  },
  itemCard: {
    width: 80,
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    position: 'relative',
  },
  countCircle: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  useBtn: {
    marginTop: 6,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  useBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  bagBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(40,18,70,0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(245,166,35,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
    position: 'relative',
  },
  bagBtnIcon: { fontSize: 18 },
  bagBtnBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f5a623',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagBtnBadgeText: {
    color: '#1a0e2e',
    fontSize: 10,
    fontWeight: '900',
  },
});
