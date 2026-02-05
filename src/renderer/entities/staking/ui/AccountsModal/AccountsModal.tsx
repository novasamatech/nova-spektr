import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';

import { type Asset, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, reservableAmountBN, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { BodyText, HelpText } from '@/shared/ui';
import { AssetBalance, Hash, Identicon } from '@/shared/ui-entities';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount, useAccountsNames } from '@/domains/network';
import { useAssetBalances } from '@/entities/balance';
import { networkModel } from '@/entities/network';

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
  const chains = useUnit(networkModel.$chains);
  const chain = chains[chainId] ?? null;
  const resolvedAccounts = useAccountsNames(accounts, chain);

  const accountIds = accounts.map((account) => account.accountId);
  const balances = useAssetBalances({
    accountIds,
    chainId,
    assetId: asset.assetId,
  });

  const findBalance = (accountId: AccountId) => {
    const balance = balances.find((b) => b.accountId === accountId) ?? null;
    return balance ? reservableAmountBN(balance) : BN_ZERO;
  };

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={onClose}>
      <Modal.Title close>{t('staking.confirmation.accountsTitle')}</Modal.Title>
      <Modal.Content>
        <ul
          className={cnTw(
            'flex flex-col gap-y-3 px-3 pb-3',
            resolvedAccounts.length > 7 && 'max-h-[388px] overflow-y-auto',
          )}
        >
          {resolvedAccounts.map((account) => {
            const address = toAddress(account.accountId, { prefix: addressPrefix });
            return (
              <li key={account.accountId} className="flex items-center justify-between" data-testid="account">
                <div className="flex items-center gap-x-2">
                  <Identicon address={address} size={20} background={false} />
                  <div className="flex w-[175px] flex-col">
                    <BodyText className="text-text-secondary">{account.name}</BodyText>
                    <HelpText className="text-text-tertiary">
                      <Hash value={address} variant="truncate" />
                    </HelpText>
                  </div>
                </div>
                <AssetBalance
                  value={findBalance(account.accountId)}
                  asset={asset}
                  className="ml-2 w-full text-end text-text-secondary"
                />
              </li>
            );
          })}
        </ul>
      </Modal.Content>
    </Modal>
  );
};
