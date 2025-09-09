import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface TileProps {
  id: string;
  letter: string;
  isJoker: boolean;
  locked?: boolean;
  invalid?: boolean;
  className?: string;
}

export const Tile = ({ id, letter, isJoker, locked, invalid, className }: TileProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: locked,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'w-10 h-10 bg-game-tile border-2 border-game-tile-border rounded-md flex items-center justify-center font-bold text-lg select-none cursor-grab active:cursor-grabbing',
        {
          'bg-game-joker text-white': isJoker,
          'opacity-50': locked,
          'border-game-invalid bg-game-invalid/10': invalid,
          'opacity-60': isDragging,
          'cursor-not-allowed': locked,
        },
        className
      )}
    >
      {letter.toUpperCase()}
    </div>
  );
};