import { type IconTheme as IdenticonIconTheme } from '@polkadot/react-identicon/types';
import { Suspense, lazy, memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { cnTw, isEthereumAccountId, validateAddress } from '@/shared/lib/utils';
import { Icon } from '@/shared/ui';
import { Copy, useTheme } from '@/shared/ui-kit';

export type { IdenticonIconTheme };

type Props = {
  value: string;
  theme?: IdenticonIconTheme;
  size?: number;
  background?: boolean;
  canCopy?: boolean;
  testId?: string;
};

const PolkadotIdenticon = lazy(() =>
  import('@polkadot/react-identicon/Identicon').then(({ Identicon: IdenticonIcon }) => ({ default: IdenticonIcon })),
);

export const Identicon = memo(
  ({ theme, value, size = 24, background = true, canCopy: canCopyProp, testId = 'Identicon' }: Props) => {
    const { t } = useI18n();
    const { preferStaticContent } = useTheme();
    const valid = validateAddress(value);
    const canCopy = typeof canCopyProp === 'undefined' ? !preferStaticContent : canCopyProp;

    const defaultTheme: IdenticonIconTheme = value && valid && isEthereumAccountId(value) ? 'ethereum' : 'polkadot';

    const emptyIcon = <Icon name="emptyIdenticon" size={background ? size * 0.75 : size} />;

    const icon = valid ? (
      <Suspense fallback={emptyIcon}>
        <PolkadotIdenticon
          theme={theme || defaultTheme}
          value={value}
          size={background ? size * 0.75 : size}
          // &>svg>circle:first-of-type - background selector
          className="pointer-events-none overflow-hidden rounded-full [&>svg>circle:first-of-type]:fill-none"
        />
      </Suspense>
    ) : (
      emptyIcon
    );

    const shouldCopy = canCopy && valid;

    console.log({ preferStaticContent, shouldCopy });

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
        <Copy value={value} notification={t('general.notifications.addressCopied')}>
          {node}
        </Copy>
      );
    }

    return node;
  },
);
