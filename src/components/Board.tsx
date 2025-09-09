import { useRef, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useDroppable } from '@dnd-kit/core';
import { Tile } from './Tile';
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

  const CELL_SIZE = 40;
  const GRID_SIZE = 50; // 50x50 grid

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly || !onTileDrop) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    
    // Only handle clicks on empty cells for now
    const existingTile = tiles.find(t => t.x === x && t.y === y);
    if (!existingTile) {
      // This would be handled by drag and drop instead
    }
  }, [onTileDrop, readOnly, tiles]);

  // Create a map of tile positions
  const tileMap = new Map<string, BoardTile>();
  tiles.forEach(tile => {
    tileMap.set(`${tile.x},${tile.y}`, tile);
  });

  // Calculate bounds to center the content
  const minX = tiles.length > 0 ? Math.min(...tiles.map(t => t.x)) : -5;
  const maxX = tiles.length > 0 ? Math.max(...tiles.map(t => t.x)) : 5;
  const minY = tiles.length > 0 ? Math.min(...tiles.map(t => t.y)) : -5;
  const maxY = tiles.length > 0 ? Math.max(...tiles.map(t => t.y)) : 5;

  const boardWidth = Math.max(GRID_SIZE, (maxX - minX + 10)) * CELL_SIZE;
  const boardHeight = Math.max(GRID_SIZE, (maxY - minY + 10)) * CELL_SIZE;

  return (
    <div className="w-full h-full bg-game-board rounded-lg overflow-hidden relative">
      <TransformWrapper
        initialScale={0.6}
        minScale={0.2}
        maxScale={3}
        centerOnInit={true}
        wheel={{ 
          step: 0.15,
          smoothStep: 0.005
        }}
        panning={{ 
          disabled: false,
          velocityDisabled: false
        }}
        doubleClick={{
          disabled: false,
          mode: "zoomIn",
          step: 0.7
        }}
        limitToBounds={false}
        centerZoomedOut={true}
      >
        <TransformComponent
          wrapperClass="w-full h-full cursor-move"
          contentClass="w-full h-full flex items-center justify-center"
        >
          <div
            ref={(node) => {
              setNodeRef(node);
              if (boardRef.current) {
                boardRef.current = node;
              }
            }}
            className="relative bg-game-board"
            style={{
              width: boardWidth,
              height: boardHeight,
              backgroundImage: `
                linear-gradient(to right, hsl(var(--game-tile-border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--game-tile-border)) 1px, transparent 1px)
              `,
              backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
            }}
            onClick={handleClick}
          >
            {/* Render tiles */}
            {tiles.map((tile) => (
              <div
                key={`${tile.x}-${tile.y}`}
                className="absolute"
                style={{
                  left: tile.x * CELL_SIZE + 2,
                  top: tile.y * CELL_SIZE + 2,
                  width: CELL_SIZE - 4,
                  height: CELL_SIZE - 4,
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
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};