import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TileSymbol = 
  | 'apple' | 'pear' | 'grape' | 'orange' | 'lemon'
  | 'mushroom' | 'leaf' | 'acorn' | 'pinecone' | 'berry'
  | 'fox' | 'wolf' | 'owl' | 'deer' | 'rabbit'
  | 'rune' | 'compass' | 'crystal' | 'bat' | 'hedgehog';

export interface Tile {
  id: string;
  symbol: TileSymbol;
  row: number;
  col: number;
}

export interface GameState {
  currentLevel: number;
  unlockedLevel: number;
  coins: number;
  skillGreen: number;
  skillRed: number;
  skillPurple: number;
}

interface GameContextType {
  gameState: GameState;
  updateCoins: (amount: number) => void;
  updateLevel: (level: number) => void;
  unlockLevel: (level: number) => void;
  updateSkills: (green: number, red: number, purple: number) => void;
  buySkill: (type: 'green' | 'red' | 'purple') => boolean;
  saveGame: () => void;
  resetGame: () => void;
}

const SAVE_VERSION = '3'; // bump this to force-reset all players

const defaultGameState: GameState = {
  currentLevel: 1,
  unlockedLevel: 1,
  coins: 0,
  skillGreen: 3,
  skillRed: 3,
  skillPurple: 3,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  useEffect(() => {
    loadGame();
  }, []);

  const loadGame = async () => {
    try {
      const saved = await AsyncStorage.getItem('forest_quest_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Version mismatch → discard old save, start fresh
        if (parsed._v !== SAVE_VERSION) {
          await AsyncStorage.removeItem('forest_quest_save');
          return;
        }
        const { _v, ...state } = parsed;
        setGameState({ ...defaultGameState, ...state });
      }
    } catch (e) {
      console.warn('Failed to load game:', e);
    }
  };

  const saveGame = useCallback(async () => {
    try {
      await AsyncStorage.setItem('forest_quest_save', JSON.stringify({ ...gameState, _v: SAVE_VERSION }));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }, [gameState]);

  useEffect(() => {
    saveGame();
  }, [gameState]);

  const updateCoins = useCallback((amount: number) => {
    setGameState(prev => ({ ...prev, coins: Math.max(0, prev.coins + amount) }));
  }, []);

  const updateLevel = useCallback((level: number) => {
    setGameState(prev => ({ ...prev, currentLevel: level }));
  }, []);

  const unlockLevel = useCallback((level: number) => {
    setGameState(prev => ({
      ...prev,
      unlockedLevel: Math.max(prev.unlockedLevel, level),
    }));
  }, []);

  const updateSkills = useCallback((green: number, red: number, purple: number) => {
    setGameState(prev => ({
      ...prev,
      skillGreen: green,
      skillRed: red,
      skillPurple: purple,
    }));
  }, []);

  const buySkill = useCallback((type: 'green' | 'red' | 'purple'): boolean => {
    if (gameState.coins < 1000) return false;
    setGameState(prev => {
      const newState = { ...prev, coins: prev.coins - 1000 };
      if (type === 'green') newState.skillGreen = prev.skillGreen + 1;
      if (type === 'red') newState.skillRed = prev.skillRed + 1;
      if (type === 'purple') newState.skillPurple = prev.skillPurple + 1;
      return newState;
    });
    return true;
  }, [gameState.coins]);

  const resetGame = useCallback(async () => {
    try {
      await AsyncStorage.removeItem('forest_quest_save');
    } catch (_) {}
    setGameState({ ...defaultGameState });
  }, []);

  return (
    <GameContext.Provider value={{
      gameState,
      updateCoins,
      updateLevel,
      unlockLevel,
      updateSkills,
      buySkill,
      saveGame,
      resetGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
