'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PresetOption<T> = {
  id: string;
  label: string;
  value: T;
};

export type PresetSwitcherProps<T> = {
  presets: Array<PresetOption<T>>;
  activeId: string;
  onSelect: (preset: PresetOption<T>) => void;
  className?: string;
};

/**
 * Simple segmented control (shadcn Button). Used by styling integration demos.
 */
export function PresetSwitcher<T>({
  presets,
  activeId,
  onSelect,
  className,
}: PresetSwitcherProps<T>) {
  return (
    <div
      role="group"
      aria-label="Theme presets"
      className={cn('flex flex-wrap gap-2', className)}
    >
      {presets.map((preset) => (
        <Button
          key={preset.id}
          type="button"
          size="sm"
          variant={preset.id === activeId ? 'default' : 'outline'}
          aria-pressed={preset.id === activeId}
          onClick={() => onSelect(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </div>
  );
}
