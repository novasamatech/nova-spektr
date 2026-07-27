import { cnTw } from '@/shared/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /** Optional colour swatch drawn before the label. */
  dotColor?: string;
};

type Props<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  label: string;
  onChange: (value: T) => void;
};

/**
 * Small pill switch used twice in this card — for the asset and for the range.
 *
 * Deliberately local: `ui-kit`'s `Tabs` is a Radix tab set that owns content
 * panels and a carousel, which is the wrong shape for a control that only
 * re-parameterises one chart. Kept here rather than promoted to the kit since
 * this card is its only consumer.
 */
export const SegmentedControl = <T extends string>({ value, options, label, onChange }: Props<T>) => {
  return (
    <div className="flex rounded-md bg-tab-background p-0.5" role="group" aria-label={label}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            className={cnTw(
              'flex cursor-pointer items-center gap-1.5 rounded px-3 py-1 text-footnote font-semibold transition-colors',
              isActive ? 'bg-white text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary',
            )}
            onClick={() => onChange(option.value)}
          >
            {option.dotColor ? (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.dotColor }} />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
