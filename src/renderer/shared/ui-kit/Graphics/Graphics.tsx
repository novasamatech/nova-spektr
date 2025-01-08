import computer from '@/shared/assets/images/misc/computer.webp';
import emptyList from '@/shared/assets/images/misc/empty-list.webp';

const images = {
  emptyList,
  computer,
} as const;

type Props = {
  name: keyof typeof images;
  size: number;
  testId?: string;
  alt?: string;
};

export const Graphics = ({ name, size, alt, testId = 'Graphics' }: Props) => {
  return (
    <img
      className="pointer-events-none select-none"
      src={images[name]}
      alt={alt}
      width={size}
      height={size}
      data-testid={`${testId}:${name}`}
    />
  );
};
