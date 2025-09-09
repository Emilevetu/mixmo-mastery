import { useDroppable } from '@dnd-kit/core';
import { Tile } from './Tile';
import { Tile as TileType } from '@/store/game';

interface RackProps {
  tiles: TileType[];
}

export const Rack = ({ tiles }: RackProps) => {
  const { setNodeRef } = useDroppable({
    id: 'player-rack',
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-card border-2 border-dashed border-muted rounded-lg p-4 min-h-16"
    >
      <div className="flex gap-2 flex-wrap">
        {tiles.map((tile, index) => (
          <Tile
            key={`rack-${tile.bagSeq}`}
            id={`rack-${tile.bagSeq}`}
            letter={tile.letter}
            isJoker={tile.isJoker}
          />
        ))}
        {tiles.length === 0 && (
          <div className="w-full text-center text-muted-foreground py-2">
            Votre chevalet
          </div>
        )}
      </div>
    </div>
  );
};