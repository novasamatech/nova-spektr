import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { CaptionText, Icon } from '@/shared/ui';
import { type Step, STEPS_ORDER } from '../model/create-draft-model';

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
    <div className="flex items-center justify-center gap-1 pt-1 pb-6">
      {steps.map(({ key, label }, i) => {
        const isCompleted = activeIndex > i;
        const isCurrent = activeIndex === i;

        return (
          <div key={key} className="flex items-center gap-2">
            <div
              className={cnTw(
                'flex items-center gap-2 rounded-full py-1 ps-1 pe-3 transition-colors',
                isCurrent && 'bg-icon-accent/10',
              )}
              {...(isCurrent ? { role: 'status', 'aria-current': 'step' } : {})}
            >
              <div
                className={cnTw(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  isCompleted && 'bg-text-positive',
                  isCurrent && 'bg-icon-accent',
                  !isCompleted && !isCurrent && 'bg-input-background-disabled',
                )}
                {...(isCompleted
                  ? {
                      'aria-label': t('operations.drafts.stepCompleted', { step: label }),
                    }
                  : {})}
              >
                {isCompleted ? (
                  <Icon name="checkmark" size={12} className="text-white" />
                ) : (
                  <CaptionText className={isCurrent ? 'text-white' : 'text-text-tertiary'}>{i + 1}</CaptionText>
                )}
              </div>
              <CaptionText
                className={cnTw(
                  'uppercase transition-colors',
                  isCurrent && 'text-icon-accent',
                  isCompleted && 'text-text-secondary',
                  !isCompleted && !isCurrent && 'text-text-tertiary',
                )}
              >
                {label}
              </CaptionText>
            </div>
            {i < STEPS_ORDER.length - 1 && (
              <div className={cnTw('h-px w-6', isCompleted ? 'bg-text-positive' : 'bg-input-background-disabled')} />
            )}
          </div>
        );
      })}
    </div>
  );
};
