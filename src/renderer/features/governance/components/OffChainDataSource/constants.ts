import { type IconNames } from '@/shared/ui/Icon/data';
import { type GovernanceApiSource } from '@/entities/governance';

export const Sources: Record<GovernanceApiSource, { title: string; icon: IconNames }> = {
  polkassembly: {
    title: 'Polkassembly',
    icon: 'polkassembly',
  },
  subsquare: {
    title: 'Subsquare',
    icon: 'subsquare',
  },
};
