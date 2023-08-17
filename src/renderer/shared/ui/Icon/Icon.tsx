import { IconCollection, IconNames } from './data';
import { cnTw } from '@renderer/shared/lib/utils';

export type IconSize = { size?: 16 | 20 | 32 };

type Props = IconSize & {
  as?: 'img' | 'svg';
  name: IconNames;
  className?: string;
  alt?: string;
};

export const Icon = ({ as = 'svg', name, size = 16, className, alt = '' }: Props) => {
  const sources = IconCollection[name];
  const availableSizes = Object.keys(sources.size).map(Number);
  const activeSize = availableSizes.includes(size) ? size : availableSizes[0];
  // @ts-ignore
  const image = sources.size[activeSize];

  if (as === 'img' || !sources.svg) {
    return (
      <img
        className={className}
        src={image}
        alt={alt}
        width={activeSize}
        height={activeSize}
        data-testid={`${name}-img`}
      />
    );
  }

  return (
    <svg
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      className={cnTw('text-icon-default', className)}
      width={activeSize}
      height={activeSize}
      viewBox={`0 0 ${activeSize} ${activeSize}`}
      data-testid={`${name}-svg`}
    >
      <use href={image} />
    </svg>
  );
};
