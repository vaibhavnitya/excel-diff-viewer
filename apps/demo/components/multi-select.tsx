'use client';

import { ChevronsUpDown } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface MultiSelectProps {
  options: readonly string[];
  value: readonly string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select columns…',
  emptyLabel = 'No columns available',
  disabled,
  id,
  className,
}: MultiSelectProps) {
  const selected = new Set(value);

  const toggle = (option: string, checked: boolean) => {
    if (checked) {
      onChange([...value, option]);
    } else {
      onChange(value.filter((item) => item !== option));
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled || options.length === 0}
            className="w-full justify-between font-normal"
          >
            <span className="truncate">
              {value.length === 0
                ? options.length === 0
                  ? emptyLabel
                  : placeholder
                : `${value.length} selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {options.map((option) => {
              const checked = selected.has(option);
              const checkboxId = `${id ?? 'ms'}-${option}`;
              return (
                <div
                  key={option}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent"
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(state) =>
                      toggle(option, state === true)
                    }
                  />
                  <Label
                    htmlFor={checkboxId}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
