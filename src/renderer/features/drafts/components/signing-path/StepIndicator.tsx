import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText } from '@/shared/ui';

export type Step = 'call-data' | 'select-path' | 'confirm';

export const STEPS_ORDER: Step[] = ['call-data', 'select-path', 'confirm'];

type Props = {
  step: Step;
};

export const StepIndicator = ({ step }: Props) => {
  const { t } = useI18n();

  const steps = [
    { key: 'call-data' as const, label: t('operations.drafts.stepCallData') },
    { key: 'select-path' as const, label: t('operations.drafts.stepSigningPath') },
    { key: 'confirm' as const, label: t('operations.drafts.stepConfirm') },
  ];

  const activeIndex = STEPS_ORDER.indexOf(step);

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map(({ key, label }, i) => {
        const isCompleted = activeIndex > i;
        const isCurrent = activeIndex === i;

        return (
          <div key={key} className="flex items-center gap-2">
            <div
              className="flex flex-col items-center gap-1"
              {...(isCurrent ? { role: 'status', 'aria-current': 'step' } : {})}
            >
              <div
                className={cnTw(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                  isCompleted && 'bg-icon-positive text-white',
                  isCurrent && 'bg-icon-accent text-white',
                  !isCompleted && !isCurrent && 'bg-input-background-disabled text-text-tertiary',
                )}
                {...(isCompleted
                  ? {
                      'aria-label': t('operations.drafts.stepCompleted', { step: label }),
                    }
                  : {})}
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <CaptionText
                className={cnTw(
                  'transition-colors',
                  isCurrent || isCompleted ? 'text-text-secondary' : 'text-text-tertiary',
                )}
              >
                {label}
              </CaptionText>
            </div>
            {i < STEPS_ORDER.length - 1 && (
              <div className={cnTw('mb-5 h-0.5 w-8', isCompleted ? 'bg-icon-positive' : 'bg-divider')} />
            )}
          </div>
        );
      })}
    </div>
  );
};
