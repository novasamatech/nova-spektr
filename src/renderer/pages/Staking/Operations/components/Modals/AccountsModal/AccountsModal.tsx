import { useI18n } from '@app/providers';
import { BaseModal, BodyText, Icon, Identicon, InfoPopover, Truncate } from '@shared/ui';
import { cnTw, stakeableAmount } from '@shared/lib/utils';
import type { Account, Asset, ChainId, Explorer } from '@shared/core';
import { AssetBalance } from '@entities/asset';
import { getExplorers } from '../../../common/utils';
import { useAssetBalances } from '@entities/balance';

type Props = {
  isOpen: boolean;
  accounts: Account[];
  amounts?: string[];
  asset: Asset;
  chainId: ChainId;
  explorers?: Explorer[];
  addressPrefix?: number;
  onClose: () => void;
};

const AccountsModal = ({ isOpen, accounts, asset, chainId, explorers, addressPrefix, onClose }: Props) => {
  const { t } = useI18n();
  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId.toString(),
  });

  const findBalance = (accountId: string): string => stakeableAmount(balances.find((b) => b.accountId === accountId));

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
          <li key={account.accountId} data-testid="account">
            <div className="flex items-center gap-x-2 p-2">
              <Identicon address={account.accountId} size={20} background={false} />
              <div className="flex flex-col max-w-[175px]">
                <BodyText className="text-text-secondary">{account.name}</BodyText>
                <Truncate
                  className="text-help-text text-text-tertiary"
                  ellipsis="..."
                  start={4}
                  end={4}
                  text={account.accountId}
                />
              </div>
              <InfoPopover data={getExplorers(account.accountId, explorers)} position="top-full right-0">
                <Icon name="info" size={16} className="group-hover:text-icon-active" />
              </InfoPopover>
              <AssetBalance
                value={findBalance(account.accountId)}
                asset={asset}
                className="text-text-secondary text-end w-full ml-2"
              />
            </div>
          </li>
        ))}
      </ul>
    </BaseModal>
  );
};

export default AccountsModal;
