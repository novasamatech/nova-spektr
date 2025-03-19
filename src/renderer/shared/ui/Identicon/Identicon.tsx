import { type IconTheme as IdenticonIconTheme } from '@polkadot/react-identicon/types';
import { Suspense, type SyntheticEvent, lazy, memo, useEffect, useState } from 'react';

import { type Address } from '@/shared/core';
import { cnTw, copyToClipboard, isEthereumAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useTheme } from '@/shared/ui-kit/Theme/useTheme';
import { Icon } from '../Icon/Icon';

type Props = {
  theme?: IconTheme;
  address?: Address;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  className?: string;
  buttonClassName?: string;
  testId?: string;
};

export type IconTheme = IdenticonIconTheme;

const PolkadotIdenticon = lazy(() =>
  import('@polkadot/react-identicon/Identicon').then(({ Identicon: IdenticonIcon }) => ({ default: IdenticonIcon })),
);

export const Identicon = memo(
  ({ theme, address, size = 24, background = true, canCopy: canCopyProp, className, testId = 'Identicon' }: Props) => {
    const { preferStaticContent } = useTheme();
    const canCopy = typeof canCopyProp === 'undefined' ? !preferStaticContent : canCopyProp;

    const defaultTheme = address && isEthereumAccountId(address as AccountId) ? 'ethereum' : 'polkadot';

    const [wrapper, setWrapper] = useState<HTMLElement | null>(null);

    useEffect(() => {
      if (!wrapper) return;

      wrapper.querySelector('circle')?.setAttribute('fill', 'none');
    }, [wrapper]);

    const onCopyToClipboard = async (e: SyntheticEvent) => {
      e.stopPropagation();
      await copyToClipboard(address);
    };

    const icon = address ? (
      <Suspense fallback={<Icon name="emptyIdenticon" size={size} />}>
        <PolkadotIdenticon
          theme={theme || defaultTheme}
          value={address}
          size={background ? size * 0.75 : size}
          className="pointer-events-none overflow-hidden rounded-full"
        />
      </Suspense>
    ) : (
      <Icon name="emptyIdenticon" size={size} />
    );

    if (!canCopy || !address) {
      return (
        <span
          ref={setWrapper}
          className={cnTw(
            'relative flex items-center justify-center',
            background && 'rounded-full bg-white',
            className,
          )}
          style={{ width: size, height: size }}
          data-testid={testId}
        >
          {icon}
        </span>
      );
    }

    return (
      <span ref={setWrapper} className={className}>
        <button
          type="button"
          className={cnTw(
            'relative flex cursor-copy items-center justify-center rounded-full',
            background && 'rounded-full bg-white',
          )}
          style={{ width: size, height: size }}
          data-testid={testId}
          onClick={onCopyToClipboard}
        >
          {icon}
        </button>
      </span>
    );
  },
);
