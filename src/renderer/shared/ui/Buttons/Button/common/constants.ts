import { Pallet } from './types';

export const SizeStyle: Record<'sm' | 'md', string> = {
  sm: 'h-7 px-3 rounded-[14px]',
  md: 'h-8 px-4 rounded-[16px]',
};

export const ButtonStyle: Record<Pallet, string> = {
  primary:
    'bg-button-primary-default transition-colors ' +
    'hover:bg-button-primary-hover active:bg-button-primary-active disabled:bg-button-primary-disabled',
  secondary:
    'bg-button-secondary-default transition-colors ' +
    'hover:bg-button-secondary-hover active:bg-button-secondary-active disabled:bg-button-secondary-disabled',
  error:
    'bg-button-negative-default transition-colors ' +
    'hover:bg-button-negative-hover active:bg-button-negative-active disabled:bg-button-negative-disabled',
};

export const TextStyle: Record<Pallet, string> = {
  primary: 'text-body text-text-white font-semibold',
  secondary: 'text-body text-text-primary font-semibold',
  error: 'text-body text-text-negative font-semibold disabled:text-text-tertiary',
};

export const IconStyle: Record<Pallet, string> = {
  primary: 'text-icon-white-default',
  secondary:
    'text-icon-primary-default transition-colors ' +
    'group-hover:text-icon-primary-hover group-active:text-icon-primary-active ',
  error: '',
};
