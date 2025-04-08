import { type Chain, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Identicon } from '@/shared/ui';
import { AccountExplorers, Hash } from '@/shared/ui-entities';
import { Checkbox } from '@/shared/ui-kit';
import { accountUtils } from '@/entities/wallet';

type Props = {
  account: VaultChainAccount | VaultShardAccount;
  chain: Chain;
  checked: boolean;
  semiChecked?: boolean;
  className?: string;
  onChange: (value: boolean) => void;
};

export const SelectableShard = ({ account, chain, checked, semiChecked, onChange }: Props) => {
  const { t } = useI18n();

  const isChain = accountUtils.isVaultChainAccount(account);
  const isShard = accountUtils.isVaultShardAccount(account);
  const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

  return (
    <div
      className={cnTw(
        'group flex cursor-pointer gap-x-1 rounded px-2 py-1.5 transition-colors',
        'focus-within:bg-action-background-hover hover:bg-action-background-hover',
      )}
    >
      <Checkbox checked={checked} semiChecked={semiChecked} onChange={(checked) => onChange(checked)} />

      <div className="grid grid-cols-[20px,1fr,auto] items-center gap-x-2">
        <Identicon address={address} size={20} background={false} canCopy={false} />
        <HelpText className="min-w-0 text-text-tertiary">
          <Hash value={address} variant="truncate" />
        </HelpText>
        <AccountExplorers accountId={account.accountId} chain={chain}>
          {(isShard || isChain) && (
            <>
              <FootnoteText className="text-text-tertiary">{t('general.explorers.derivationTitle')}</FootnoteText>
              <HelpText className="break-all text-text-secondary">{account.derivationPath}</HelpText>
            </>
          )}
        </AccountExplorers>
      </div>
    </div>
  );
};
