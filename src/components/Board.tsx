import { useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useDroppable } from '@dnd-kit/core';
import { Tile } from './Tile';
import { BoardCell } from './BoardCell';
import { BoardTile } from '@/store/game';

interface BoardProps {
  tiles: BoardTile[];
  onTileDrop?: (x: number, y: number, tileId: string) => void;
  readOnly?: boolean;
}

export const Board = ({ tiles, onTileDrop, readOnly }: BoardProps) => {
  const boardRef = useRef<HTMLDivElement>(null);
  
  const { setNodeRef } = useDroppable({
    id: 'game-board',
  });

  const CELL_SIZE = 45; // Légèrement plus grand pour une meilleure UX
  const GRID_SIZE = 8; // Grille fixe 8x8
  const MIN_GRID_SIZE = 15; // Grille minimum plus petite
  const PADDING = 3; // Padding autour du contenu

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || !onTileDrop) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    
    // Check if click is within the 8x8 grid bounds
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      // Only handle clicks on empty cells for now
      const existingTile = tiles.find(t => t.x === x && t.y === y);
      if (!existingTile) {
        // This would be handled by drag and drop instead
      }
    }
  }, [onTileDrop, readOnly, tiles]);

  // Create a map of tile positions
  const tileMap = new Map<string, BoardTile>();
  tiles.forEach(tile => {
    tileMap.set(`${tile.x},${tile.y}`, tile);
  });

  // Fixed 8x8 grid
  const minX = 0;
  const maxX = 7; // GRID_SIZE - 1
  const minY = 0;
  const maxY = 7; // GRID_SIZE - 1

  console.log('Fixed 8x8 grid bounds:', { minX, maxX, minY, maxY, tilesCount: tiles.length });
  console.log('Tiles data:', tiles);

  const boardWidth = GRID_SIZE * CELL_SIZE;
  const boardHeight = GRID_SIZE * CELL_SIZE;

  return (
    <div className="w-full h-full bg-game-board rounded-lg overflow-hidden relative">
      <TransformWrapper
        initialScale={0.8}
        minScale={0.3}
        maxScale={2.5}
        centerOnInit={true}
        wheel={{ 
          step: 0.1,
          smoothStep: 0.005
        }}
        panning={{ 
          disabled: true, // Désactiver le panning pour éviter les conflits
          velocityDisabled: true
        }}
        doubleClick={{
          disabled: true, // Désactiver le double-click pour éviter les conflits
          mode: "zoomIn",
          step: 0.8
        }}
        limitToBounds={false}
        centerZoomedOut={true}
      >
        <TransformComponent
          wrapperClass="w-full h-full cursor-default"
          contentClass="w-full h-full flex items-center justify-center"
        >
          <div
            ref={(node) => {
              setNodeRef(node);
              if (boardRef.current) {
                boardRef.current = node;
              }
            }}
            data-board-container
            className="relative bg-game-board"
            style={{
              width: boardWidth,
              height: boardHeight,
              backgroundImage: `
                linear-gradient(to right, hsl(var(--game-tile-border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--game-tile-border)) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
              backgroundPosition: '0 0',
              pointerEvents: 'none', // Empêcher les événements de pointer sur le conteneur
            }}
            onClick={handleClick}
          >
        {/* Render drop zones for the fixed 8x8 grid */}
        {Array.from({ length: GRID_SIZE }, (_, i) => i).map(x =>
          Array.from({ length: GRID_SIZE }, (_, i) => i).map(y => {
            const hasTile = tiles.some(t => t.x === x && t.y === y);
            return (
              <BoardCell
                key={`cell-${x}-${y}`}
                x={x}
                y={y}
                hasTile={hasTile}
              />
            );
          })
        )}
        
        {/* Render tiles */}
        {tiles.map((tile) => {
          const left = tile.x * CELL_SIZE + 2;
          const top = tile.y * CELL_SIZE + 2;
          
          console.log(`Rendering tile ${tile.letter} at:`, {
            absolute: { x: tile.x, y: tile.y },
            position: { left, top }
          });
          
          return (
            <div
              key={`${tile.x}-${tile.y}`}
              className="absolute z-10"
              style={{
                left,
                top,
                width: CELL_SIZE - 4,
                height: CELL_SIZE - 4,
                pointerEvents: 'auto', // Permettre les événements de pointer sur les tuiles
              }}
            >
            <Tile
              id={`board-${tile.bagSeq}`}
              letter={tile.asLetter || tile.letter}
              isJoker={tile.isJoker}
              locked={tile.locked}
              className="w-full h-full"
            />
          </div>
        );
        })}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};