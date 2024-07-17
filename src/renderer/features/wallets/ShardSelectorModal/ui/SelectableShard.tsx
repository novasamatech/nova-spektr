import { useI18n } from '@app/providers';

import type { BaseAccount, ChainAccount, Explorer, ShardAccount, Wallet } from '@shared/core';
import { cnTw, toAddress } from '@shared/lib/utils';
import { BodyText, Checkbox, HelpText, IconButton, Identicon, Truncate } from '@shared/ui';

import { ExplorersPopover, accountUtils, walletUtils } from '@entities/wallet';

type Props = {
  wallet?: Wallet;
  account: BaseAccount | ChainAccount | ShardAccount;
  addressPrefix?: number;
  explorers?: Explorer[];
  checked: boolean;
  semiChecked?: boolean;
  truncate?: boolean;
  className?: string;
  onChange: (value: boolean) => void;
};

export const SelectableShard = ({
  wallet,
  account,
  addressPrefix,
  explorers,
  checked,
  semiChecked,
  truncate,
  className,
  onChange,
}: Props) => {
  const { t } = useI18n();

  const isChain = accountUtils.isChainAccount(account);
  const isShard = accountUtils.isShardAccount(account);
  const isBase = accountUtils.isBaseAccount(account);
  const isSharded = isShard || isChain;
  const address = toAddress(account.accountId, { prefix: addressPrefix });

  const theme = isBase && walletUtils.isPolkadotVault(wallet) ? 'jdenticon' : undefined;

  const content = (
    <div className="flex items-center gap-x-2">
      <Identicon address={address} theme={theme} size={20} background={false} canCopy={false} />
      <div className={cnTw('truncate mr-auto', className)}>
        {account.name && !isShard && <BodyText>{account.name}</BodyText>}
        {truncate ? (
          <Truncate text={address} className="text-text-tertiary text-help-text" />
        ) : (
          <HelpText className="text-text-tertiary">{address}</HelpText>
        )}
      </div>

      <IconButton name="info" size={16} className="shrink-0 group-hover:text-icon-hover" />
    </div>
  );

  return (
    <div
      className={cnTw(
        'group flex gap-x-1 px-2 py-1.5 rounded transition-colors cursor-pointer',
        'hover:bg-action-background-hover focus-within:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={(event) => onChange(event.target.checked)} />
      <ExplorersPopover
        button={content}
        address={account.accountId}
        addressPrefix={addressPrefix}
        explorers={explorers}
      >
        <ExplorersPopover.Group active={isSharded} title={t('general.explorers.derivationTitle')}>
          <HelpText className="text-text-secondary break-all">{isSharded && account.derivationPath}</HelpText>
        </ExplorersPopover.Group>
      </ExplorersPopover>
    </div>
  );
};
