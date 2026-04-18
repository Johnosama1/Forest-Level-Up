import { TileSymbol, Tile } from '../context/GameContext';

const EASY_SYMBOLS: TileSymbol[] = ['apple', 'pear', 'grape', 'orange', 'lemon'];
const MEDIUM_SYMBOLS: TileSymbol[] = [
  'apple', 'pear', 'grape', 'orange', 'lemon',
  'mushroom', 'leaf', 'acorn', 'pinecone', 'berry',
];
const HARD_SYMBOLS: TileSymbol[] = [
  'apple', 'pear', 'grape', 'orange', 'lemon',
  'mushroom', 'leaf', 'acorn', 'pinecone', 'berry',
  'fox', 'wolf', 'owl', 'deer', 'rabbit',
  'rune', 'compass', 'crystal', 'bat', 'hedgehog',
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
  const syms: TileSymbol[] = ['apple','apple','apple','pear','pear','pear','grape','grape','grape'];
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

// ── Per-level configuration for smooth difficulty curve ──────────────────
function getLevelConfig(level: number): { activeCols: number; activeRows: number; depth: number } {
  // Level 1 = tutorial (handled separately)
  if (level === 2) {
    // Level 2: full 5×7 board, 1 layer deep — first full challenge
    return { activeCols: 5, activeRows: 7, depth: 1 };
  } else if (level === 3) {
    // Level 3: full board, 2 layers
    return { activeCols: 5, activeRows: 7, depth: 2 };
  } else if (level <= 6) {
    // Easy: 4×3 to 4×5 grid, 1-2 layers
    return { activeCols: 4, activeRows: 3 + level - 3, depth: level <= 4 ? 1 : 2 };
  } else if (level <= 15) {
    // Medium: full 5-col, growing rows, depth 2-3
    return { activeCols: 5, activeRows: Math.min(4 + Math.floor((level - 7) / 2), 7), depth: level <= 10 ? 2 : 3 };
  } else if (level <= 50) {
    // Hard: full board, depth 3-6
    return { activeCols: 5, activeRows: 7, depth: 3 + Math.floor((level - 15) / 10) };
  } else {
    // Very hard: full board, depth grows capped at 10
    return { activeCols: 5, activeRows: 7, depth: Math.min(7 + Math.floor((level - 50) / 50), 10) };
  }
}

export function generateBoard(level: number): GameBoard {
  if (level === 1) return generateTutorialBoard();

  const { activeCols, activeRows, depth } = getLevelConfig(level);

  // Determine how many active cells we'll use
  const activeCells = activeCols * activeRows;
  const rawTarget = depth * activeCells;
  // Ensure multiple of 3
  const targetTiles = Math.max(Math.floor(rawTarget / 3) * 3, 9);

  const { symbols, numSymbols } = getSymbolsForLevel(level);
  const usedSymbols = symbols.slice(0, numSymbols);
  const symbolList = buildSymbolList(targetTiles, usedSymbols);
  const shuffled = shuffle(symbolList);

  // Initialize empty board
  const board: GameBoard = Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => [] as Tile[])
  );

  // Center the active area in the board
  const rowOffset = Math.floor((BOARD_ROWS - activeRows) / 2);
  const colOffset = Math.floor((BOARD_COLS - activeCols) / 2);

  // Fill stacks layer by layer
  let idx = 0;
  for (let d = 0; d < depth; d++) {
    for (let r = 0; r < activeRows; r++) {
      for (let c = 0; c < activeCols; c++) {
        if (idx < shuffled.length) {
          const br = r + rowOffset;
          const bc = c + colOffset;
          board[br][bc].push({
            id: generateId(),
            symbol: shuffled[idx++],
            row: br,
            col: bc,
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
  apple: '#e53935', pear: '#8bc34a', grape: '#9c27b0', orange: '#ff7043', lemon: '#fdd835',
  mushroom: '#8d6e63', leaf: '#4caf50', acorn: '#795548', pinecone: '#546e7a', berry: '#e91e63',
  fox: '#ff8f00', wolf: '#78909c', owl: '#6d4c41', deer: '#a1887f', rabbit: '#f5f5f5',
  rune: '#5c6bc0', compass: '#00897b', crystal: '#00b0ff', bat: '#37474f', hedgehog: '#bf8c6b',
};
