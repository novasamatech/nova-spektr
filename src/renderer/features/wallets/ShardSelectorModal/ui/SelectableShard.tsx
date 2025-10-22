import { type Chain, type VaultChainAccount, type VaultShardAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { FootnoteText, HelpText, Icon } from '@/shared/ui';
import { AccountExplorers, Hash, Identicon } from '@/shared/ui-entities';
import { Checkbox } from '@/shared/ui-kit';
import { KeyIcon, accountUtils } from '@/entities/wallet';

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
        'group grid h-11 w-full max-w-full grid-cols-[1fr_auto] items-center gap-x-2 rounded-md px-2 py-1.5',
        'transition-colors duration-100 hover:bg-action-background-hover',
      )}
    >
      <div className="overflow-hidden">
        <Checkbox checked={checked} semiChecked={semiChecked} onChange={(checked) => onChange(checked)}>
          <div className="flex w-full grow items-center gap-x-2 overflow-hidden">
            <div className="flex flex-row">
              <Identicon
                address={toAddress(account.accountId, { prefix: chain?.addressPrefix })}
                size={20}
                background={false}
                canCopy={false}
              />
              <Icon
                className="z-10 -ml-2.5 rounded-full border bg-white text-text-secondary"
                size={20}
                name={KeyIcon[account.keyType]}
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <FootnoteText
                className={cnTw('truncate', checked || semiChecked ? 'text-text-primary' : 'text-text-secondary')}
              >
                {account.derivationPath}
              </FootnoteText>
              <HelpText className="text-text-tertiary">
                <Hash value={address} variant="truncate" />
              </HelpText>
            </div>
          </div>
        </Checkbox>
      </div>
      <AccountExplorers accountId={account.accountId} chain={chain}>
        {(isShard || isChain) && (
          <>
            <FootnoteText className="text-text-tertiary">{t('general.explorers.derivationTitle')}</FootnoteText>
            <HelpText className="break-all text-text-secondary">{account.derivationPath}</HelpText>
          </>
        )}
      </AccountExplorers>
    </div>
  );
};
