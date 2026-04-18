import { TileSymbol, Tile } from '../context/GameContext';

const EASY_SYMBOLS: TileSymbol[] = ['apple', 'pear', 'grape', 'orange', 'lemon'];
const MEDIUM_SYMBOLS: TileSymbol[] = [
  'apple', 'pear', 'grape', 'orange', 'lemon',
  'mushroom', 'leaf', 'acorn', 'pinecone', 'berry'
];
const HARD_SYMBOLS: TileSymbol[] = [
  'apple', 'pear', 'grape', 'orange', 'lemon',
  'mushroom', 'leaf', 'acorn', 'pinecone', 'berry',
  'fox', 'wolf', 'owl', 'deer', 'rabbit',
  'rune', 'compass', 'crystal', 'bat', 'hedgehog'
];

export interface LevelConfig {
  rows: number;
  cols: number;
  symbols: TileSymbol[];
  numSymbols: number;
}

export function getLevelConfig(level: number): LevelConfig {
  if (level <= 5) {
    return { rows: 5, cols: 5, symbols: EASY_SYMBOLS, numSymbols: Math.min(3 + level, 5) };
  } else if (level <= 20) {
    return { rows: 6, cols: 7, symbols: MEDIUM_SYMBOLS, numSymbols: Math.min(4 + Math.floor(level / 3), 10) };
  } else if (level <= 100) {
    return { rows: 7, cols: 8, symbols: HARD_SYMBOLS, numSymbols: Math.min(6 + Math.floor(level / 10), 16) };
  } else {
    return { rows: 8, cols: 9, symbols: HARD_SYMBOLS, numSymbols: Math.min(8 + Math.floor(level / 50), 20) };
  }
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function generateTiles(level: number): Tile[] {
  const config = getLevelConfig(level);
  const { rows, cols, symbols, numSymbols } = config;

  const usedSymbols = symbols.slice(0, numSymbols);
  const totalCells = rows * cols;

  const symbolList: TileSymbol[] = [];
  let i = 0;
  while (symbolList.length < totalCells) {
    symbolList.push(usedSymbols[i % usedSymbols.length]);
    i++;
  }

  // Ensure counts are multiples of 3
  const countMap: Record<string, number> = {};
  for (const s of symbolList) {
    countMap[s] = (countMap[s] || 0) + 1;
  }
  const finalList: TileSymbol[] = [];
  for (const [sym, count] of Object.entries(countMap)) {
    const adjusted = Math.floor(count / 3) * 3;
    for (let j = 0; j < adjusted; j++) {
      finalList.push(sym as TileSymbol);
    }
  }

  // Pad to fill grid
  while (finalList.length < totalCells) {
    finalList.push(usedSymbols[Math.floor(Math.random() * usedSymbols.length)]);
  }

  // Shuffle
  const shuffled = shuffle(finalList.slice(0, totalCells));

  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < shuffled.length) {
        tiles.push({
          id: generateId() + idx,
          symbol: shuffled[idx],
          row: r,
          col: c,
        });
      }
    }
  }

  return tiles;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function checkMatch(tray: Tile[]): TileSymbol | null {
  if (tray.length < 3) return null;
  const last3 = tray.slice(-3);
  const sym = last3[0].symbol;
  if (last3.every(t => t.symbol === sym)) {
    return sym;
  }
  return null;
}

export function isBoardEmpty(tiles: Tile[]): boolean {
  return tiles.length === 0;
}

export function isTrayFull(tray: Tile[]): boolean {
  return tray.length >= 7;
}

export function hasTwinsInTray(tray: Tile[]): { symbol: TileSymbol; indices: number[] } | null {
  const symbolMap: Record<string, number[]> = {};
  for (let i = 0; i < tray.length; i++) {
    const s = tray[i].symbol;
    if (!symbolMap[s]) symbolMap[s] = [];
    symbolMap[s].push(i);
    if (symbolMap[s].length === 2) {
      return { symbol: s as TileSymbol, indices: symbolMap[s] };
    }
  }
  return null;
}

export function getSymbolEmoji(symbol: TileSymbol): string {
  const map: Record<TileSymbol, string> = {
    apple: '🍎',
    pear: '🍐',
    grape: '🍇',
    orange: '🍊',
    lemon: '🍋',
    mushroom: '🍄',
    leaf: '🍃',
    acorn: '🌰',
    pinecone: '🌲',
    berry: '🫐',
    fox: '🦊',
    wolf: '🐺',
    owl: '🦉',
    deer: '🦌',
    rabbit: '🐰',
    rune: '🔮',
    compass: '🧭',
    crystal: '💎',
    bat: '🦇',
    hedgehog: '🦔',
  };
  return map[symbol] || '❓';
}

export const SYMBOL_COLORS: Record<TileSymbol, string> = {
  apple: '#e53935',
  pear: '#8bc34a',
  grape: '#9c27b0',
  orange: '#ff7043',
  lemon: '#fdd835',
  mushroom: '#8d6e63',
  leaf: '#4caf50',
  acorn: '#795548',
  pinecone: '#546e7a',
  berry: '#e91e63',
  fox: '#ff8f00',
  wolf: '#78909c',
  owl: '#6d4c41',
  deer: '#a1887f',
  rabbit: '#f5f5f5',
  rune: '#5c6bc0',
  compass: '#00897b',
  crystal: '#00b0ff',
  bat: '#37474f',
  hedgehog: '#bf8c6b',
};
