import { ReactNode } from 'react';

export type TabItem = {
  id: string | number;
  title: ReactNode;
  subTitle?: string;
  panel: ReactNode;
};
