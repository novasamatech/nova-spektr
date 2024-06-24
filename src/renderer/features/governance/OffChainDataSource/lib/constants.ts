import { IconNames } from '@shared/ui/Icon/data';
import type { SourceType } from '@entities/governance';

export const Sources: Record<SourceType, { title: string; icon: IconNames }> = {
  polkassembly: {
    title: 'Polkassembly',
    icon: 'polkassembly',
  },
  subsquare: {
    title: 'Subsquare',
    icon: 'subsquare',
  },
};
