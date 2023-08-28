import { ReactNode } from 'react';

type BaseHTMLInputProps = 'value' | 'required' | 'disabled' | 'placeholder' | 'name' | 'className';

export type HTMLInputProps = BaseHTMLInputProps | 'type' | 'tabIndex' | 'spellCheck';

export type HTMLTextAreaProps = BaseHTMLInputProps | 'rows' | 'maxLength' | 'spellCheck';

export type HTMLInputFileProps = HTMLInputProps | 'accept';

export type Position = 'up' | 'down' | 'auto';
export type Theme = 'dark' | 'light';

export type DropdownOption<T extends any = any> = {
  id: string;
  element: ReactNode;
  value: T;
};

export type DropdownResult<T extends any = any> = {
  id: string;
  value: T;
};

export type ComboboxOption<T extends any = any> = DropdownOption<T>;
