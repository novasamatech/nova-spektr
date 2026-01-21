import { format } from 'date-fns';
import { useState } from 'react';
import { type DateRange, DayPicker } from 'react-day-picker';

import { Icon } from '@/shared/ui';
import { Input } from '../Input/Input';
import { Popover } from '../Popover/Popover';
import 'react-day-picker/style.css';
import './styles.css';

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
  const [isOpen, setIsOpen] = useState(false);

  const formatRange = (range: DateRange | undefined): string => {
    if (!range) return placeholder;
    if (range.from && range.to) return `${format(range.from, 'LLL dd')} - ${format(range.to, 'LLL dd')}`;
    if (range.from) return format(range.from, 'LLL dd');
    return placeholder;
  };

  const handleChange = (range: DateRange | undefined) => {
    setSelectedRange(range);
    onChange?.(range);
  };

  return (
    <Popover open={isOpen && !isDisabled} onToggle={setIsOpen}>
      <Popover.Trigger>
        <div className="cursor-pointer">
          <Input
            readOnly
            placeholder={placeholder}
            value={formatRange(selectedRange)}
            disabled={isDisabled}
            prefixElement={<Icon name="calendar" size={16} />}
            onClick={() => setIsOpen(true)}
          />
        </div>
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
