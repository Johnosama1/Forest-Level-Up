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

export interface PlayerProfile {
  username: string;
  playerId: string;
  soundEnabled: boolean;
}

interface GameContextType {
  gameState: GameState;
  profile: PlayerProfile;
  updateCoins: (amount: number) => void;
  updateLevel: (level: number) => void;
  unlockLevel: (level: number) => void;
  updateSkills: (green: number, red: number, purple: number) => void;
  buySkill: (type: 'green' | 'red' | 'purple') => boolean;
  saveGame: () => void;
  resetGame: () => void;
  updateUsername: (name: string) => void;
  toggleSound: () => void;
}

const SAVE_VERSION = '4';
const PROFILE_KEY  = 'forest_quest_profile';

function generateUsername(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `مستخدم${num}`;
}

function generatePlayerId(): string {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `FQ-${ts}-${rnd}`;
}

const defaultGameState: GameState = {
  currentLevel: 1,
  unlockedLevel: 1,
  coins: 2000,
  skillGreen: 3,
  skillRed: 3,
  skillPurple: 3,
};

const defaultProfile: PlayerProfile = {
  username: generateUsername(),
  playerId: generatePlayerId(),
  soundEnabled: true,
};

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const [profile,   setProfile]   = useState<PlayerProfile>(defaultProfile);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      // Load game save
      const saved = await AsyncStorage.getItem('forest_quest_save');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed._v !== SAVE_VERSION) {
          await AsyncStorage.removeItem('forest_quest_save');
        } else {
          const { _v, ...state } = parsed;
          setGameState(prev => ({ ...prev, ...state }));
        }
      }

      // Load player profile (persists across save resets)
      const savedProfile = await AsyncStorage.getItem(PROFILE_KEY);
      if (savedProfile) {
        setProfile(prev => ({ ...prev, ...JSON.parse(savedProfile) }));
      } else {
        // First launch — persist the auto-generated profile
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(defaultProfile));
      }
    } catch (e) {
      console.warn('Failed to load:', e);
    }
  };

  const saveProfile = useCallback(async (p: PlayerProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    } catch (_) {}
  }, []);

  const saveGame = useCallback(async () => {
    try {
      await AsyncStorage.setItem('forest_quest_save', JSON.stringify({ ...gameState, _v: SAVE_VERSION }));
    } catch (e) {
      console.warn('Failed to save game:', e);
    }
  }, [gameState]);

  useEffect(() => { saveGame(); }, [gameState]);

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
    setGameState(prev => ({ ...prev, skillGreen: green, skillRed: red, skillPurple: purple }));
  }, []);

  const buySkill = useCallback((type: 'green' | 'red' | 'purple'): boolean => {
    if (gameState.coins < 1000) return false;
    setGameState(prev => {
      const newState = { ...prev, coins: prev.coins - 1000 };
      if (type === 'green')  newState.skillGreen  = prev.skillGreen  + 1;
      if (type === 'red')    newState.skillRed    = prev.skillRed    + 1;
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

  const updateUsername = useCallback((name: string) => {
    setProfile(prev => {
      const next = { ...prev, username: name };
      saveProfile(next);
      return next;
    });
  }, [saveProfile]);

  const toggleSound = useCallback(() => {
    setProfile(prev => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled };
      saveProfile(next);
      return next;
    });
  }, [saveProfile]);

  return (
    <GameContext.Provider value={{
      gameState,
      profile,
      updateCoins,
      updateLevel,
      unlockLevel,
      updateSkills,
      buySkill,
      saveGame,
      resetGame,
      updateUsername,
      toggleSound,
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
