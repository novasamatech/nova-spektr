import { cnTw } from '@/shared/lib/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  label: string;
  onChange: (value: T) => void;
};

/**
 * Small pill switch for the asset toggle — a twin of the rewards chart's local
 * control, and local for the same reason: `ui-kit`'s `Tabs` is a Radix tab set
 * that owns content panels, the wrong shape for a control that only
 * re-parameterises one chart. Duplicated rather than imported so neither widget
 * depends on the other being installed.
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
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
