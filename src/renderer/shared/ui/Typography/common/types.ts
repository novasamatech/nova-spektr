import { type PropsWithChildren } from 'react';

export type Tags =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'p'
  | 'span'
  | 'small'
  | 'em'
  | 'strong'
  | 'dt'
  | 'dd'
  | 'li'
  | 'ul'
  | 'div';

export type Align = 'left' | 'right' | 'center' | 'balance';

type Props = {
  as: Tags;
  align: Align;
  className?: string;
  testId?: string;
};

export type TypographyProps = PropsWithChildren<Partial<Props>>;
