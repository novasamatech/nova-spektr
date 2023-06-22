import cnTw from '@renderer/shared/utils/twMerge';
import { ReactComponent as CheckSvg } from '@images/functionals/checkmark.svg';

const getTitleClass = (isStart: boolean, isEnd: boolean): string => {
  const defaultClass = 'mt-2.5 absolute top-full w-max ';

  if (isEnd) return defaultClass + 'translate-x-[calc(-100%+40px)]';
  if (isStart) return defaultClass;

  return defaultClass + 'translate-x-[calc(-50%+20px)]';
};

type StepProps = {
  index: number;
  title: string;
  isStart: boolean;
  isEnd: boolean;
};

const InactiveStep = ({ index, title, isStart, isEnd }: StepProps) => (
  <div className="flex items-center cursor-default gap-x-2.5" data-testid="inactive-step">
    <div className="relative">
      <div className="flex justify-center items-center rounded-full border-2 border-shade-20 bg-white text-shade-40 w-10 h-10">
        {index + 1}
      </div>
      <p className={cnTw('text-shade-40', getTitleClass(isStart, isEnd))}>{title}</p>
    </div>
    {!isEnd && <hr className="w-full border-shade-20" />}
  </div>
);

const ActiveStep = ({ index, title, isStart, isEnd }: StepProps) => (
  <div className="flex items-center cursor-default gap-x-2.5" data-testid="active-step">
    <div className="relative">
      <div className="flex justify-center items-center rounded-full bg-tertiary text-text-white w-10 h-10">
        {index + 1}
      </div>
      <p className={cnTw('font-bold text-neutral-variant', getTitleClass(isStart, isEnd))}>{title}</p>
    </div>
    {!isEnd && <hr className="w-full border-shade-20" />}
  </div>
);

const CompleteStep = ({ title, isStart, isEnd }: StepProps) => (
  <div className="flex items-center cursor-default gap-x-2.5" data-testid="complete-step">
    <div className="relative">
      <div className="flex justify-center items-center rounded-full bg-success text-text-white w-10 h-10">
        <CheckSvg width={24} height={24} className="text-text-white" role="img" />
      </div>
      <p className={cnTw('text-shade-40', getTitleClass(isStart, isEnd))}>{title}</p>
    </div>
    {!isEnd && <hr className="w-full border-t-2 border-success" />}
  </div>
);

type Props = {
  steps: Record<'title', string>[];
  active: number;
};

const Stepper = ({ steps, active }: Props) => (
  <ul className="flex gap-x-2.5 w-full">
    {steps.map(({ title }, index) => {
      const isStart = index === 0;
      const isEnd = index === steps.length - 1;

      let variant = CompleteStep;
      if (index === active) variant = ActiveStep;
      else if (index > active) variant = InactiveStep;

      return (
        <li key={title} className={cnTw(!isEnd && 'flex-1')}>
          {variant({ index, title, isStart, isEnd })}
        </li>
      );
    })}
  </ul>
);

export default Stepper;
