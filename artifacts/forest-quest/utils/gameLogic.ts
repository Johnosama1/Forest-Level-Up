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
  totalTiles: number;
  symbols: TileSymbol[];
  numSymbols: number;
}

export function getLevelConfig(level: number): LevelConfig {
  const COLS = 5;
  // Each level adds 39 tiles (multiple of 3), capped at 300
  const raw = level * 39;
  const totalTiles = Math.min(raw, 300);
  const rows = Math.ceil(totalTiles / COLS);

  let symbols: TileSymbol[];
  let numSymbols: number;
  if (level <= 5) {
    symbols = EASY_SYMBOLS;
    numSymbols = Math.min(2 + level, 5);
  } else if (level <= 20) {
    symbols = MEDIUM_SYMBOLS;
    numSymbols = Math.min(4 + Math.floor(level / 3), 10);
  } else {
    symbols = HARD_SYMBOLS;
    numSymbols = Math.min(6 + Math.floor(level / 10), 20);
  }

  return { rows, cols: COLS, totalTiles, symbols, numSymbols };
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function generateTiles(level: number): Tile[] {
  const { rows, cols, totalTiles, symbols, numSymbols } = getLevelConfig(level);

  const usedSymbols = symbols.slice(0, numSymbols);

  // Build symbol list as multiples of 3
  const perSymbol = Math.floor(totalTiles / numSymbols / 3) * 3 || 3;
  const symbolList: TileSymbol[] = [];
  for (const sym of usedSymbols) {
    for (let i = 0; i < perSymbol; i++) {
      symbolList.push(sym);
    }
  }
  // Fill remaining spots to reach totalTiles (always in groups of 3)
  let idx = 0;
  while (symbolList.length < totalTiles) {
    symbolList.push(usedSymbols[idx % usedSymbols.length]);
    symbolList.push(usedSymbols[idx % usedSymbols.length]);
    symbolList.push(usedSymbols[idx % usedSymbols.length]);
    idx++;
  }

  const shuffled = shuffle(symbolList.slice(0, totalTiles));

  // Pick random positions in the grid for the tiles (leave some cells empty)
  const totalCells = rows * cols;
  const allPositions: { row: number; col: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      allPositions.push({ row: r, col: c });
    }
  }
  const usedPositions = shuffle(allPositions).slice(0, totalTiles);

  const tiles: Tile[] = shuffled.map((symbol, i) => ({
    id: generateId() + i,
    symbol,
    row: usedPositions[i].row,
    col: usedPositions[i].col,
  }));

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
    apple: '🍎', pear: '🍐', grape: '🍇', orange: '🍊', lemon: '🍋',
    mushroom: '🍄', leaf: '🍃', acorn: '🌰', pinecone: '🌲', berry: '🫐',
    fox: '🦊', wolf: '🐺', owl: '🦉', deer: '🦌', rabbit: '🐰',
    rune: '🔮', compass: '🧭', crystal: '💎', bat: '🦇', hedgehog: '🦔',
  };
  return map[symbol] || '❓';
}

export const SYMBOL_COLORS: Record<TileSymbol, string> = {
  apple: '#e53935', pear: '#8bc34a', grape: '#9c27b0', orange: '#ff7043', lemon: '#fdd835',
  mushroom: '#8d6e63', leaf: '#4caf50', acorn: '#795548', pinecone: '#546e7a', berry: '#e91e63',
  fox: '#ff8f00', wolf: '#78909c', owl: '#6d4c41', deer: '#a1887f', rabbit: '#f5f5f5',
  rune: '#5c6bc0', compass: '#00897b', crystal: '#00b0ff', bat: '#37474f', hedgehog: '#bf8c6b',
};
