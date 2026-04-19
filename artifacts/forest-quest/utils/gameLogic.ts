import { TileSymbol, Tile } from '../context/GameContext';

// ── السهل: حيوانات الغابة الأساسية ──────────────────────────────────
const EASY_SYMBOLS: TileSymbol[] = ['fox', 'wolf', 'owl', 'deer', 'rabbit'];
// ── المتوسط: حيوانات + عناصر الغابة ──────────────────────────────────
const MEDIUM_SYMBOLS: TileSymbol[] = [
  'fox', 'wolf', 'owl', 'deer', 'rabbit',
  'bat', 'hedgehog', 'mushroom', 'leaf', 'acorn',
];
// ── الصعب: كل الرموز ──────────────────────────────────────────────────
const HARD_SYMBOLS: TileSymbol[] = [
  'fox', 'wolf', 'owl', 'deer', 'rabbit',
  'bat', 'hedgehog', 'mushroom', 'leaf', 'acorn',
  'pinecone', 'berry', 'rune', 'compass', 'crystal',
  'apple', 'pear', 'grape', 'orange', 'lemon',
];

// Fixed board grid dimensions (fits in one screen)
export const BOARD_COLS = 5;
export const BOARD_ROWS = 7;

// GameBoard is [row][col] = stack of tiles, index 0 = top (tappable)
export type GameBoard = Tile[][][];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function getSymbolsForLevel(level: number): { symbols: TileSymbol[]; numSymbols: number } {
  if (level <= 5) {
    return { symbols: EASY_SYMBOLS, numSymbols: Math.min(2 + level, 5) };
  } else if (level <= 20) {
    return { symbols: MEDIUM_SYMBOLS, numSymbols: Math.min(4 + Math.floor(level / 3), 10) };
  } else {
    return { symbols: HARD_SYMBOLS, numSymbols: Math.min(6 + Math.floor(level / 10), 20) };
  }
}

function buildSymbolList(target: number, usedSymbols: TileSymbol[]): TileSymbol[] {
  const n = usedSymbols.length;
  // Distribute evenly, all in multiples of 3
  const perSym = Math.floor(target / n / 3) * 3 || 3;
  const list: TileSymbol[] = [];
  for (const sym of usedSymbols) {
    for (let i = 0; i < perSym; i++) list.push(sym);
  }
  // Fill remainder in groups of 3
  let i = 0;
  while (list.length < target) {
    list.push(usedSymbols[i % n]);
    list.push(usedSymbols[i % n]);
    list.push(usedSymbols[i % n]);
    i++;
  }
  return list.slice(0, target);
}

// ── Tutorial board for level 1 — 9 tiles only (3 × 3 symbols) ──────────
function generateTutorialBoard(): GameBoard {
  const board: GameBoard = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => [] as Tile[])
  );
  const syms: TileSymbol[] = ['fox','fox','fox','wolf','wolf','wolf','owl','owl','owl'];
  const s = shuffle(syms);
  // Place 9 tiles in a 3×3 block centred in the bottom-middle of the board
  const positions: [number, number][] = [
    [3,1],[3,2],[3,3],
    [4,1],[4,2],[4,3],
    [5,1],[5,2],[5,3],
  ];
  positions.forEach(([r, c], i) => {
    board[r][c].push({ id: generateId(), symbol: s[i], row: r, col: c });
  });
  return board;
}

// ── Target tile count per level ──────────────────────────────────────────
// Level 1 = 9 (tutorial)
// Level 2 = 51 (~50, nearest multiple of 3)
// Level 3 = 90 (51 × 1.8, floored to multiple of 3)
// Each subsequent level × 1.8, capped at 345 (35 cells × ~10 deep)
function getTargetTiles(level: number): number {
  if (level === 1) return 9;
  const MAX_TILES = BOARD_COLS * BOARD_ROWS * 10; // 350 absolute max
  const raw = 51 * Math.pow(1.8, level - 2);
  const capped = Math.min(raw, MAX_TILES);
  return Math.max(Math.floor(capped / 3) * 3, 9);
}

export function generateBoard(level: number): GameBoard {
  if (level === 1) return generateTutorialBoard();

  const targetTiles = getTargetTiles(level);
  const totalCells = BOARD_COLS * BOARD_ROWS; // 35

  // Depth = minimum layers needed to hold all tiles across the full grid
  const depth = Math.ceil(targetTiles / totalCells);

  const { symbols, numSymbols } = getSymbolsForLevel(level);
  const usedSymbols = symbols.slice(0, numSymbols);
  const symbolList = buildSymbolList(targetTiles, usedSymbols);
  const shuffled = shuffle(symbolList);

  // Initialize empty full board
  const board: GameBoard = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => [] as Tile[])
  );

  // Fill layer by layer — earlier layers fill all 35 cells,
  // final partial layer fills only as many cells as tiles remain
  let idx = 0;
  for (let d = 0; d < depth; d++) {
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (idx < shuffled.length) {
          board[r][c].push({
            id: generateId(),
            symbol: shuffled[idx++],
            row: r,
            col: c,
          });
        }
      }
    }
  }

  return board;
}

export function isBoardEmpty(board: GameBoard): boolean {
  return board.every(row => row.every(stack => stack.length === 0));
}

export function totalTilesOnBoard(board: GameBoard): number {
  return board.reduce((sum, row) => sum + row.reduce((s, stack) => s + stack.length, 0), 0);
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
  const counts: Record<string, number> = {};
  for (const t of tray) {
    counts[t.symbol] = (counts[t.symbol] || 0) + 1;
    if (counts[t.symbol] >= 3) return t.symbol as TileSymbol;
  }
  return null;
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
    if (symbolMap[s].length === 2) return { symbol: s as TileSymbol, indices: symbolMap[s] };
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
  // حيوانات الغابة — ألوان مميزة
  fox:      '#ff8f00',  // برتقالي دافئ
  wolf:     '#7986cb',  // بنفسجي رمادي
  owl:      '#8d6e63',  // بني دافئ
  deer:     '#e8a87c',  // بيج دافئ
  rabbit:   '#b0bec5',  // رمادي فاتح
  bat:      '#ab47bc',  // بنفسجي
  hedgehog: '#bf8c6b',  // بني مائل للذهبي
  // عناصر الغابة
  mushroom: '#ef6c00', leaf: '#43a047', acorn: '#6d4c41',
  pinecone: '#546e7a', berry: '#e91e63',
  // عناصر سحرية
  rune: '#5c6bc0', compass: '#00897b', crystal: '#00b0ff',
  // الفواكه (مستخدمة في المراحل الصعبة فقط)
  apple: '#e53935', pear: '#8bc34a', grape: '#9c27b0', orange: '#ff7043', lemon: '#fdd835',
};
