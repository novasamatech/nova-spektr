import cn from 'classnames';
import { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export const enum ViewType {
  Text,
  Fill,
  Outline,
}
export const enum ViewColor {
  Primary,
  Secondary,
  Error,
  Shade,
}

const ViewClass = {
  [`${ViewType.Text}_${ViewColor.Primary}`]: 'text-primary border-white bg-white',
  [`${ViewType.Text}_${ViewColor.Secondary}`]: 'text-secondary border-white bg-white',
  [`${ViewType.Text}_${ViewColor.Error}`]: 'text-error border-white bg-white',
  [`${ViewType.Text}_${ViewColor.Shade}`]: 'text-shade-40 border-white bg-white',
  [`${ViewType.Fill}_${ViewColor.Primary}`]: 'text-white border-primary bg-primary',
  [`${ViewType.Fill}_${ViewColor.Secondary}`]: 'text-white border-secondary bg-secondary',
  [`${ViewType.Fill}_${ViewColor.Error}`]: 'text-white border-error bg-error',
  [`${ViewType.Fill}_${ViewColor.Shade}`]: 'text-shade-40 border-shade-20 bg-shade-20',
  [`${ViewType.Outline}_${ViewColor.Primary}`]: 'text-primary border-current bg-white',
  [`${ViewType.Outline}_${ViewColor.Secondary}`]: 'text-secondary border-current bg-white',
  [`${ViewType.Outline}_${ViewColor.Error}`]: 'text-error border-current bg-white',
  [`${ViewType.Outline}_${ViewColor.Shade}`]: 'text-shade-40 border-shade-20 bg-white',
};

const WeightClass = {
  sm: 'text-xs leading-3.5 py-1.5 px-2',
  md: 'text-xs leading-3.5 py-2 px-2',
  lg: 'text-sm leading-4 py-3 px-3',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  view: [ViewType, ViewColor];
  weight?: keyof typeof WeightClass;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
}

const Button = ({
  view,
  type = 'button',
  weight = 'md',
  className,
  disabled,
  children,
  startAdornment,
  endAdornment,
  onClick,
}: PropsWithChildren<Props>) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'block rounded-lg border font-semibold',
        WeightClass[weight],
        ViewClass[`${view[0]}_${disabled ? ViewColor.Shade : view[1]}`],
        className,
      )}
      onClick={onClick}
    >
      {startAdornment && <span>{startAdornment}</span>}
      {children}
      {endAdornment && <span>{endAdornment}</span>}
    </button>
  );
};

export default Button;
