import { format } from 'date-fns';
import { useState } from 'react';
import { type DateRange, DayPicker } from 'react-day-picker';

import { cnTw } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Popover } from '../Popover/Popover';
import 'react-day-picker/style.css';
import './styles.css';

const formatRange = (range: DateRange | undefined): string => {
  if (!range || (!range.from && !range.to)) return '';
  if (range.from && range.to) return `${format(range.from, 'LLL dd')} - ${format(range.to, 'LLL dd')}`;
  if (range.from) return format(range.from, 'LLL dd');
  return '';
};

export interface DateRangePickerProps {
  defaultValue?: DateRange;
  placeholder?: string;
  isDisabled?: boolean;
  onChange?: (range: DateRange | undefined) => void;
}

export const DateRangePicker = ({
  defaultValue,
  placeholder = '',
  isDisabled = false,
  onChange,
}: DateRangePickerProps) => {
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(defaultValue);

  const handleChange = (range: DateRange | undefined) => {
    setSelectedRange(range);
    onChange?.(range);
  };

  const formattedRange = formatRange(selectedRange);

  return (
    <Popover>
      <Popover.Trigger>
        <button
          className="flex h-full w-full cursor-pointer items-center gap-2 truncate rounded-sm border border-filter-border bg-input-background px-3 py-[7px] text-start outline-none focus:outline-none active:outline-none disabled:bg-input-background-disabled disabled:text-text-tertiary"
          disabled={isDisabled}
          type="button"
        >
          <Icon name="calendar" size={16} />
          <span
            className={cnTw(
              'w-full truncate text-footnote',
              formattedRange ? 'text-text-primary' : 'text-text-secondary',
            )}
          >
            {formattedRange || placeholder}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Content>
        <DayPicker
          mode="range"
          navLayout="around"
          required
          animate
          showOutsideDays
          defaultMonth={selectedRange?.from}
          selected={selectedRange}
          disabled={isDisabled}
          onSelect={handleChange}
        />
      </Popover.Content>
    </Popover>
  );
};
