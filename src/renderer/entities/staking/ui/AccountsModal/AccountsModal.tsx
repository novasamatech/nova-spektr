import { useI18n } from '@app/providers';
import { BaseModal, BodyText, Identicon, Truncate } from '@shared/ui';
import { cnTw, stakeableAmount, toAddress } from '@shared/lib/utils';
import type { Account, AccountId, Asset, ChainId } from '@shared/core';
import { AssetBalance } from '../../../asset';
import { useAssetBalances } from '../../../balance';

type Props = {
  isOpen: boolean;
  accounts: Account[];
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
      panelClass="w-[368px]"
      title={t('staking.confirmation.accountsTitle')}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ul className={cnTw('flex flex-col gap-y-3', accounts.length > 7 && 'max-h-[388px] overflow-y-auto')}>
        {accounts.map((account) => (
          <li key={account.accountId} className="flex justify-between items-center p-2" data-testid="account">
            <div className="flex items-center gap-x-2">
              <Identicon address={account.accountId} size={20} background={false} />
              <div className="flex flex-col max-w-[175px]">
                <BodyText className="text-text-secondary">{account.name}</BodyText>
                <Truncate
                  className="text-help-text text-text-tertiary"
                  ellipsis="..."
                  start={4}
                  end={4}
                  text={toAddress(account.accountId, { prefix: addressPrefix })}
                />
              </div>
            </div>
            <AssetBalance
              value={findBalance(account.accountId)}
              asset={asset}
              className="text-text-secondary text-end w-full ml-2"
            />
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};
