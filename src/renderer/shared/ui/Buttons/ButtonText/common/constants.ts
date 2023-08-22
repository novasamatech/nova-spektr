export const SizeStyle: Record<'sm' | 'md', string> = {
  sm: 'h-7 px-3 rounded-sm',
  md: 'h-8 px-3 rounded-sm',
};

const TextGeneralStyle =
  'text-body text-button-primary-default font-semibold transition-colors ' +
  'group-hover:text-button-primary-hover group-active:text-button-primary-active group-disabled:text-button-primary-disabled';

export const TextStyle: Record<keyof typeof SizeStyle, string> = {
  sm: `${TextGeneralStyle} text-footnote`,
  md: `${TextGeneralStyle} text-body`,
};

export const IconStyle =
  'text-icon-accent-default transition-colors ' +
  'group-hover:text-icon-accent-hover group-active:text-icon-accent-active group-disabled:text-icon-accent-disabled';
