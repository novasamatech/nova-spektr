import { type IconTheme as IdenticonIconTheme } from '@polkadot/react-identicon/types';
import { Suspense, lazy, memo } from 'react';
import { toast } from 'sonner';

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
    const onAddressCopied = () => toast.success(t('receive.addressCopied'));

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

    if (!canCopy || !valid) {
      return (
        <span
          className={cnTw('relative flex items-center justify-center rounded-full', background && 'bg-white')}
          style={{ width: size, height: size }}
          data-testid={testId}
        >
          {icon}
        </span>
      );
    }

    return (
      <Copy value={value} onCopied={onAddressCopied}>
        <button
          type="button"
          className={cnTw(
            'relative flex cursor-copy appearance-none items-center justify-center rounded-full',
            background && 'rounded-full bg-white',
          )}
          aria-label="Copy address"
          style={{ width: size, height: size }}
          data-testid={testId}
        >
          {icon}
        </button>
      </Copy>
    );
  },
);
