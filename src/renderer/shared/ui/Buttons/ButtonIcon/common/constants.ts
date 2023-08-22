export const SizeStyle: Record<'sm' | 'md', string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

export const SizeStyleBG: Record<'sm' | 'md', string> = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
};

export const ButtonStyle = 'rounded';
export const ButtonStyleBG = 'rounded-full transition-colors ' + 'hover:bg-bg-primary-hover active:bg-bg-primary-hover';

export const IconStyle =
  'text-icon-primary-default transition-colors ' +
  'group-hover:text-icon-primary-hover group-focus:text-icon-primary-hover group-active:text-icon-primary-active group-disabled:text-icon-primary-default';
