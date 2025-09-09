import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface BoardCellProps {
  x: number;
  y: number;
  hasTile: boolean;
  className?: string;
}

export const BoardCell = ({ x, y, hasTile, className }: BoardCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${x}-${y}`,
  });

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
        left: x * 45 + 2,
        top: y * 45 + 2,
        width: 41,
        height: 41,
      }}
    />
  );
};
