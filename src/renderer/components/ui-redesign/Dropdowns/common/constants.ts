import { Position } from './types';

export const ViewClass: Record<Exclude<Position, 'auto'>, string> = {
  up: 'bottom-full mb-2.5',
  down: 'top-full mt-2.5',
};

export const OptionsContainerStyle =
  'mt-1 absolute z-20 py-2 px-1 max-h-60 w-full overflow-auto border border-token-container-border rounded bg-input-background';

export const OptionStyle = 'py-2 px-3 hover:bg-action-background-hover rounded cursor-pointer';
