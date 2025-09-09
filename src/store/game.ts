import { create } from 'zustand';

export interface Tile {
  bagSeq: number;
  letter: string;
  isJoker: boolean;
  asLetter?: string;
}

export interface BoardTile extends Tile {
  x: number;
  y: number;
  locked: boolean;
}

export interface GameState {
  roomId: string | null;
  gameState: 'waiting' | 'active' | 'finished';
  myRack: Tile[];
  opponentRack: Tile[];
  myBoard: BoardTile[];
  opponentBoard: BoardTile[];
  bagCount: number;
  mixmoEnabled: boolean;
  currentPlayer: string | null;
  
  // Actions
  setRoomId: (roomId: string) => void;
  setGameState: (state: 'waiting' | 'active' | 'finished') => void;
  updateRack: (tiles: Tile[]) => void;
  updateBoard: (tiles: BoardTile[]) => void;
  setBagCount: (count: number) => void;
  setMixmoEnabled: (enabled: boolean) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  roomId: null,
  gameState: 'waiting',
  myRack: [],
  opponentRack: [],
  myBoard: [],
  opponentBoard: [],
  bagCount: 0,
  mixmoEnabled: false,
  currentPlayer: null,

  setRoomId: (roomId) => set({ roomId }),
  setGameState: (gameState) => set({ gameState }),
  updateRack: (myRack) => set({ myRack }),
  updateBoard: (myBoard) => set({ myBoard }),
  setBagCount: (bagCount) => set({ bagCount }),
  setMixmoEnabled: (mixmoEnabled) => set({ mixmoEnabled }),
  reset: () => set({
    roomId: null,
    gameState: 'waiting',
    myRack: [],
    opponentRack: [],
    myBoard: [],
    opponentBoard: [],
    bagCount: 0,
    mixmoEnabled: false,
    currentPlayer: null,
  }),
}));