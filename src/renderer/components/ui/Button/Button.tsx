import cn from 'classnames';
import { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

type Variant = 'text' | 'fill' | 'outline';
type Pallet = 'primary' | 'secondary' | 'error' | 'shade';

const ViewClass: Record<`${Variant}_${Pallet}`, string> = {
  text_primary: 'text-primary border-white bg-white',
  text_secondary: 'text-secondary border-white bg-white',
  text_error: 'text-error border-white bg-white',
  text_shade: 'text-shade-40 border-white bg-white',
  fill_primary: 'text-white border-primary bg-primary',
  fill_secondary: 'text-white border-secondary bg-secondary',
  fill_error: 'text-white border-error bg-error',
  fill_shade: 'text-shade-40 border-shade-20 bg-shade-20',
  outline_primary: 'text-primary border-current bg-white',
  outline_secondary: 'text-secondary border-current bg-white',
  outline_error: 'text-error border-current bg-white',
  outline_shade: 'text-shade-40 border-shade-20 bg-white',
};

const WeightClass = {
  sm: 'text-xs leading-3.5 py-1.5 px-2',
  md: 'text-xs leading-3.5 py-2 px-2',
  lg: 'text-sm leading-4 py-3 px-3',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: Variant;
  pallet: Pallet;
  weight?: keyof typeof WeightClass;
  prefixElement?: ReactNode;
  suffixElement?: ReactNode;
}

const Button = ({
  variant,
  pallet,
  type = 'button',
  weight = 'md',
  className,
  disabled,
  children,
  prefixElement,
  suffixElement,
  onClick,
}: PropsWithChildren<Props>) => (
  <button
    type={type}
    disabled={disabled}
    className={cn(
      'flex items-center justify-center gap-x-2.5 rounded-lg border font-semibold',
      WeightClass[weight],
      ViewClass[`${variant}_${disabled ? 'shade' : pallet}`],
      className,
    )}
    onClick={onClick}
  >
    {prefixElement && <div data-testid="prefix">{prefixElement}</div>}
    <div className={cn(prefixElement && 'ml-auto', suffixElement && 'ml-0 mr-auto')}>{children}</div>
    {suffixElement && <div data-testid="suffix">{suffixElement}</div>}
  </button>
);

export default Button;
