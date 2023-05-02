import cn from 'classnames';
import React from 'react';

// eslint-plugin-react has problems with DetailedHTMLProps so this workaround needed
// https://github.com/jsx-eslint/eslint-plugin-react/issues/3284
interface LabelProps extends React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement> {}

export const LabelText = ({ className, ...props }: LabelProps) => (
  <label className={cn('text-footnote font-inter text-text-primary', className)} {...props} />
);
