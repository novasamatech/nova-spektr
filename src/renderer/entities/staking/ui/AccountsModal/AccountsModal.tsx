import { type Asset, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, stakeableAmount, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BaseModal, BodyText, HelpText, Identicon } from '@/shared/ui';
import { Hash } from '@/shared/ui-entities';
import { type AnyAccount } from '@/domains/network';
import { AssetBalance } from '@/entities/asset';
import { useAssetBalances } from '@/entities/balance';

type Props = {
  isOpen: boolean;
  accounts: AnyAccount[];
  amounts?: string[];
  asset: Asset;
  chainId: ChainId;
  addressPrefix: number;
  onClose: () => void;
};

export const AccountsModal = ({ isOpen, accounts, asset, chainId, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();

  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const findBalance = (accountId: AccountId): string => {
    return stakeableAmount(balances.find((b) => b.accountId === accountId));
  };

  return (
    <BaseModal
      closeButton
      contentClass="pb-3 px-3"
      panelClass="w-modal-sm"
      title={t('staking.confirmation.accountsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ul className={cnTw('flex flex-col gap-y-3', accounts.length > 7 && 'max-h-[388px] overflow-y-auto')}>
        {accounts.map((account) => (
          <li key={account.accountId} className="flex items-center justify-between p-2" data-testid="account">
            <div className="flex items-center gap-x-2">
              <Identicon address={account.accountId} size={20} background={false} />
              <div className="flex w-[175px] flex-col">
                <BodyText className="text-text-secondary">{account.name}</BodyText>
                <HelpText className="text-text-tertiary">
                  <Hash value={toAddress(account.accountId, { prefix: addressPrefix })} variant="truncate" />
                </HelpText>
              </div>
            </div>
            <AssetBalance
              value={findBalance(account.accountId)}
              asset={asset}
              className="ml-2 w-full text-end text-text-secondary"
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
