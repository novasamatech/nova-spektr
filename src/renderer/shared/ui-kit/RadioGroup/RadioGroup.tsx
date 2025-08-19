import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { type PropsWithChildren, createContext, useContext, useMemo } from 'react';

import { cnTw } from '@/shared/lib/utils';
import { BodyText, HeaderTitleText, LabelText, SmallTitleText } from '@/shared/ui/Typography';

import './RadioGroup.css';

type RadioOption<T = string> = {
  id: string;
  value: T;
  title?: string;
  description?: string;
};

type ContextProps = {
  name?: string;
  disabled?: boolean;
  testId?: string;
};

const Context = createContext<ContextProps>({});

type RootProps<T> = {
  name?: string;
  value?: string;
  disabled?: boolean;
  testId?: string;
  className?: string;
  label?: string;
  onChange?: (value: T) => void;
};

const Root = <T extends string>({
  name,
  value,
  disabled,
  testId = 'RadioGroup',
  className,
  children,
  label,
  onChange,
}: PropsWithChildren<RootProps<T>>) => {
  const ctx = useMemo(() => ({ name, disabled, testId }), [name, disabled, testId]);

  const radioElement = (
    <RadixRadioGroup.Root
      name={name}
      value={value}
      disabled={disabled}
      className={cnTw('flex w-full flex-col', className)}
      data-testid={testId}
      onValueChange={onChange}
    >
      {children}
    </RadixRadioGroup.Root>
  );

  if (!label) {
    return <Context.Provider value={ctx}>{radioElement}</Context.Provider>;
  }

  return (
    <Context.Provider value={ctx}>
      <div className="flex w-full flex-col gap-y-2">
        <LabelText className="text-text-tertiary">{label}</LabelText>
        {radioElement}
      </div>
    </Context.Provider>
  );
};

type CardOptionProps<T = string> = {
  option: RadioOption<T>;
  className?: string;
  testId?: string;
};

const CardOption = <T extends string>({ option, testId, children }: PropsWithChildren<CardOptionProps<T>>) => {
  const { disabled } = useContext(Context);
  const { value, title, description } = option;

  return (
    <RadixRadioGroup.Item
      value={String(value)}
      disabled={disabled}
      className="flex disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div
        data-testid={testId}
        className="flex-1 cursor-pointer rounded-sm border border-filter-border p-6 group-disabled:cursor-not-allowed data-[state=checked]:border-active-container-border"
      >
        {children ? (
          children
        ) : (
          <>
            <div className="flex items-center justify-between">
              {title && (
                <HeaderTitleText as="p" className="mb-2 text-tab-text-accent">
                  {title}
                </HeaderTitleText>
              )}

              <span className="spektr-radio relative h-4 w-4 rounded-full border border-filter-border bg-card-background data-[state=checked]:border-0 data-[state=checked]:bg-primary-button-background-default" />
            </div>

            {description && <BodyText className="text-text-secondary">{description}</BodyText>}
          </>
        )}
      </div>
    </RadixRadioGroup.Item>
  );
};

type OptionProps<T = string> = {
  option: RadioOption<T>;
};

const Option = <T extends string>({ option, children }: PropsWithChildren<OptionProps<T>>) => {
  const { disabled } = useContext(Context);
  const { value, title } = option;

  return (
    <RadixRadioGroup.Item
      value={String(value)}
      disabled={disabled}
      className="group mb-2 last:mb-0 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="w-full cursor-pointer rounded-sm border border-filter-border group-disabled:cursor-not-allowed group-data-[state=checked]:border-active-container-border">
        <div className="flex cursor-pointer items-center justify-between p-3 transition group-disabled:cursor-not-allowed group-data-[state=checked]:bg-hover group-data-[state=unchecked]:bg-tab-background hover:bg-hover focus:bg-hover">
          <SmallTitleText as="p" className="text-button-large group-data-[state=checked]:text-action-text">
            {title}
          </SmallTitleText>
          <span className="spektr-radio relative h-4 w-4 rounded-full border border-filter-border bg-card-background group-data-[state=checked]:border-0 group-data-[state=checked]:bg-primary-button-background-default" />
        </div>
        {children && <div className="p-3">{children}</div>}
      </div>
    </RadixRadioGroup.Item>
  );
};

const RadioButton = () => (
  <span className="spektr-radio relative h-4 w-4 rounded-full border border-filter-border bg-card-background" />
);

export const RadioGroup = Object.assign(Root, {
  CardOption,
  Option,
  RadioButton,
});
