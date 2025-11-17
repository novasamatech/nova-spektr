import { FootnoteText } from '@/shared/ui';

export type Step = {
  label: string;
  isActive: boolean;
  isCompleted: boolean;
};

type StepIndicatorProps = {
  steps: Step[];
};

export const StepIndicator = ({ steps }: StepIndicatorProps) => {
  return (
    <div className="flex items-center gap-2">
      {steps.map(step => {
        const getStepColor = () => {
          if (step.isCompleted) return 'text-black';
          if (step.isActive) return 'text-icon-accent';
          return 'text-text-tertiary';
        };

        const getIndicatorColor = () => {
          if (step.isCompleted) return 'bg-black';
          if (step.isActive) return 'bg-icon-accent';
          return 'bg-text-tertiary';
        };

        return (
          <div key={step.label} className="flex w-[108px] flex-col items-center gap-2">
            <FootnoteText className={getStepColor()}>{step.label}</FootnoteText>
            <div className={`h-1 w-full rounded-full ${getIndicatorColor()}`} />
          </div>
        );
      })}
    </div>
  );
};
