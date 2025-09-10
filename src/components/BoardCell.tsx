import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { GridBounds } from '@/store/game';

interface BoardCellProps {
  x: number;
  y: number;
  hasTile: boolean;
  gridBounds: GridBounds;
  className?: string;
}

export const BoardCell = ({ x, y, hasTile, gridBounds, className }: BoardCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${x}-${y}`,
  });

  const CELL_SIZE = 45;
  const relativeX = x - gridBounds.minX;
  const relativeY = y - gridBounds.minY;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'absolute border border-transparent transition-all duration-200 ease-in-out rounded-sm',
        {
          'bg-blue-200/40 border-blue-400 shadow-md scale-105': isOver && !hasTile,
          'bg-red-200/40 border-red-400 shadow-md scale-105': isOver && hasTile,
          'hover:bg-gray-100/20': !isOver && !hasTile,
        },
        className
      )}
      style={{
        left: relativeX * CELL_SIZE + 2,
        top: relativeY * CELL_SIZE + 2,
        width: CELL_SIZE - 4,
        height: CELL_SIZE - 4,
        pointerEvents: 'auto', // Permettre les événements de pointer sur les cellules
      }}
    />
  );
};
