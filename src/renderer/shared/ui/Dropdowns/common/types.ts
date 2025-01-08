import { type MouseEvent, type ReactNode } from 'react';

import { type IconNames } from '../../Icon/data';

export type Position = 'up' | 'down' | 'auto';
export type Theme = 'dark' | 'light';

export const ThemeStyles: Record<Theme, string> = {
  light: 'bg-input-background text-text-primary',
  dark: 'text-white',
};

export type DropdownOption<T = any> = {
  id: string;
  element: ReactNode;
  value: T;
  disabled?: boolean;
};

export type DropdownResult<T = any> = {
  id: string;
  value: T;
};

export type ComboboxOption<T = any> = DropdownOption<T>;

export type DropdownIconButtonOption = {
  icon: IconNames;
  title: string;
  onClick: () => void;
};

type OptionBase = {
  id: string;
  title: string;
  icon: IconNames | ReactNode;
};

type LinkOption = OptionBase & { to: string };
type ButtonOption = OptionBase & { onClick?: (event: MouseEvent<HTMLButtonElement>) => void };

export type ButtonDropdownOption = LinkOption | ButtonOption;
