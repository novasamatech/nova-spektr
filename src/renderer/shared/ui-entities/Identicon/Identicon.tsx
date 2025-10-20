import { type IconTheme as IdenticonIconTheme } from '@polkadot/react-identicon/types';
import { Suspense, lazy, memo } from 'react';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, isEthereumAccountId, validateAddress } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Copy, useTheme } from '@/shared/ui-kit';

export type { IdenticonIconTheme };

type Props = {
  address: Address | null | undefined;
  theme?: IdenticonIconTheme;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  /**
   * Force default indentity icon placeholder
   */
  invalid?: boolean;
  testId?: string;
};

const PolkadotIdenticon = lazy(() =>
  import('@polkadot/react-identicon/Identicon').then(({ Identicon: IdenticonIcon }) => ({ default: IdenticonIcon })),
);

export const Identicon = memo(
  ({ theme, address, size = 24, background = true, canCopy: canCopyProp, invalid, testId = 'Identicon' }: Props) => {
    const { t } = useI18n();
    const { preferStaticContent } = useTheme();
    const validAddress = address && validateAddress(address);
    const canCopy = typeof canCopyProp === 'undefined' ? !preferStaticContent : canCopyProp;

    const defaultTheme: IdenticonIconTheme =
      address && validAddress && isEthereumAccountId(address) ? 'ethereum' : 'polkadot';

    const emptyIcon = <Icon name="emptyIdenticon" size={background ? size * 0.75 : size} />;

    const icon =
      validAddress && !invalid ? (
        <Suspense fallback={emptyIcon}>
          <PolkadotIdenticon
            theme={theme || defaultTheme}
            value={address}
            size={background ? size * 0.75 : size}
            // &>svg>circle:first-of-type - background selector
            className="pointer-events-none overflow-hidden rounded-full [&>svg>circle:first-of-type]:fill-none"
          />
        </Suspense>
      ) : (
        emptyIcon
      );

    const shouldCopy = canCopy && validAddress;

    const node = (
      <span
        className={cnTw(
          'relative flex appearance-none items-center justify-center rounded-full',
          background && 'rounded-full bg-white',
          shouldCopy && 'cursor-copy',
        )}
        style={{ width: size, height: size }}
        data-testid={testId}
      >
        {icon}
      </span>
    );

    if (shouldCopy) {
      return (
        <Copy value={address} notification={t('general.notifications.addressCopied')}>
          {node}
        </Copy>
      );
    }

    return node;
  },
);
