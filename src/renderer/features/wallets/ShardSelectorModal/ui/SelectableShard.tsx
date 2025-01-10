import {
  type Explorer,
  type VaultBaseAccount,
  type VaultChainAccount,
  type VaultShardAccount,
  type Wallet,
} from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { BodyText, HelpText, IconButton, Identicon, Truncate } from '@/shared/ui';
import { Checkbox } from '@/shared/ui-kit';
import { ExplorersPopover, accountUtils, walletUtils } from '@/entities/wallet';

type Props = {
  wallet?: Wallet;
  account: VaultBaseAccount | VaultChainAccount | VaultShardAccount;
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

  const isChain = accountUtils.isVaultChainAccount(account);
  const isShard = accountUtils.isVaultShardAccount(account);
  const isBase = accountUtils.isVaultBaseAccount(account);
  const isSharded = isShard || isChain;
  const address = toAddress(account.accountId, { prefix: addressPrefix });

  const theme = isBase && walletUtils.isPolkadotVault(wallet) ? 'jdenticon' : undefined;

  const content = (
    <div className="flex items-center gap-x-2">
      <Identicon address={address} theme={theme} size={20} background={false} canCopy={false} />
      <div className={cnTw('mr-auto truncate', className)}>
        {account.name && !isShard && <BodyText>{account.name}</BodyText>}
        {truncate ? (
          <Truncate text={address} className="text-help-text text-text-tertiary" />
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
        'group flex cursor-pointer gap-x-1 rounded px-2 py-1.5 transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={(checked) => onChange(checked)} />
      <ExplorersPopover
        button={content}
        address={account.accountId}
        addressPrefix={addressPrefix}
        explorers={explorers}
      >
        <ExplorersPopover.Group active={isSharded} title={t('general.explorers.derivationTitle')}>
          <HelpText className="break-all text-text-secondary">{isSharded && account.derivationPath}</HelpText>
        </ExplorersPopover.Group>
      </ExplorersPopover>
    </div>
  );
};
