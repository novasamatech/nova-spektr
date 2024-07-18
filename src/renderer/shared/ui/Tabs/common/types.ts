import { type ReactNode } from 'react';

export type TabItem = {
  id: string | number;
  title: ReactNode;
  panel: ReactNode;
};
