import { PropsWithChildren } from 'react';

export type Tags = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p' | 'span' | 'small' | 'em' | 'strong' | 'dt' | 'dd';

export type FontWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold';

export type Align = 'left' | 'right' | 'center';

type Props = {
  as: Tags;
  fontWeight: FontWeight;
  align: Align;
  className?: string;
};

export type TypographyProps = PropsWithChildren<Partial<Props>>;
