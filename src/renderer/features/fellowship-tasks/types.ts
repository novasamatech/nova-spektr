import { type ComponentType } from 'react';

export type TaskDescription = {
  id: string;
  priority: 0 | 1 | 2;
  body: ComponentType<{ canSkip: boolean; onSkip: VoidFunction }>;
};
