import { format } from 'date-fns';
import { type DateRange, DayPicker } from 'react-day-picker';

import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { Button, Icon } from '@/shared/ui';
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
  value?: DateRange;
  placeholder?: string;
  isDisabled?: boolean;
  onChange?: (range: DateRange | undefined) => void;
}

export const DateRangePicker = ({ value, placeholder = '', isDisabled = false, onChange }: DateRangePickerProps) => {
  const { t } = useI18n();

  const handleReset = () => {
    onChange?.(undefined);
  };

  const formattedRange = formatRange(value);

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
        <div className="flex flex-col">
          <DayPicker
            mode="range"
            navLayout="around"
            required
            animate
            showOutsideDays
            defaultMonth={value?.from}
            selected={value}
            disabled={isDisabled}
            onSelect={onChange}
          />
          <div className="flex justify-end border-t border-filter-border px-3 py-2">
            <Button variant="text" size="sm" disabled={isDisabled} onClick={handleReset}>
              {t('general.button.resetButton')}
            </Button>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  );
};
