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

export interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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
  gridBounds: GridBounds;
  
  // Actions
  setRoomId: (roomId: string) => void;
  setGameState: (state: 'waiting' | 'active' | 'finished') => void;
  updateRack: (tiles: Tile[]) => void;
  updateBoard: (tiles: BoardTile[]) => void;
  setBagCount: (count: number) => void;
  setMixmoEnabled: (enabled: boolean) => void;
  expandGrid: (direction: 'top' | 'bottom' | 'left' | 'right') => void;
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
  gridBounds: { minX: 0, maxX: 7, minY: 0, maxY: 7 }, // Grille 8x8 par défaut

  setRoomId: (roomId) => set({ roomId }),
  setGameState: (gameState) => set({ gameState }),
  updateRack: (myRack) => set({ myRack }),
  updateBoard: (myBoard) => set({ myBoard }),
  setBagCount: (bagCount) => set({ bagCount }),
  setMixmoEnabled: (mixmoEnabled) => set({ mixmoEnabled }),
  expandGrid: (direction) => set((state) => {
    const { gridBounds } = state;
    switch (direction) {
      case 'top':
        return { gridBounds: { ...gridBounds, minY: gridBounds.minY - 1 } };
      case 'bottom':
        return { gridBounds: { ...gridBounds, maxY: gridBounds.maxY + 1 } };
      case 'left':
        return { gridBounds: { ...gridBounds, minX: gridBounds.minX - 1 } };
      case 'right':
        return { gridBounds: { ...gridBounds, maxX: gridBounds.maxX + 1 } };
      default:
        return state;
    }
  }),
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
    gridBounds: { minX: 0, maxX: 7, minY: 0, maxY: 7 },
  }),
}));