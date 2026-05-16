import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { useI18n } from '@/shared/i18n';
import { entries, groupBy, performSearch } from '@/shared/lib/utils';
import { BodyText, Button, FootnoteText, Icon, Plate, SmallTitleText } from '@/shared/ui';
import { Checkbox, Modal, SearchInput, useNotification } from '@/shared/ui-kit';
import { accounts, useWalletsNames } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { walletSelectService } from '@/aggregates/wallet-select';
import { hiddenWalletsBalancesModel } from '../model/balances';
import { hiddenWalletsModel } from '../model/hidden-wallets';

import { WalletGroup } from './walletGroup';

export const HiddenWalletsModal = () => {
  const { t } = useI18n();

  const { toast } = useNotification();

  const inputQuery = useUnit(hiddenWalletsModel.$inputQuery);
  const query = useUnit(hiddenWalletsModel.$query);
  const selectionState = useUnit(hiddenWalletsModel.$selectionState);

  const hiddenWallets = useUnit(hiddenWalletsModel.$hiddenWallets);

  const allAccounts = useUnit(accounts.$list);
  const chains = useUnit(networkModel.$chains);

  useEffect(() => {
    hiddenWalletsBalancesModel.loadBalances();
  }, []);

  const resolvedWallets = useWalletsNames(hiddenWallets);

  const filteredWallets = useMemo(() => {
    return performSearch({
      query,
      records: resolvedWallets,
      getMeta: (wallet) => ({
        allAddresses: walletSelectService.composeWalletMeta(wallet, allAccounts, chains),
      }),
      weights: { name: 1, allAddresses: 0.8 },
    });
  }, [resolvedWallets, query, allAccounts, chains]);

  const filteredWalletsByType = useMemo(() => {
    return groupBy(filteredWallets, (wallet) => wallet.type);
  }, [filteredWallets]);

  const content = useMemo(() => {
    if (hiddenWallets.length === 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-12">
          <Icon size={64} name="empty" className="mb-6" />
          <SmallTitleText>{t('settings.hiddenWallets.emptyList')}</SmallTitleText>
          <FootnoteText className="mt-2 text-center text-text-tertiary">
            {t('settings.hiddenWallets.emptyListDescription')}
          </FootnoteText>
        </div>
      );
    }

    if (hiddenWallets.length > 0 && filteredWallets.length === 0 && inputQuery.length > 0) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-12">
          <Icon size={64} name="empty" className="mb-6" />
          <SmallTitleText>{t('settings.hiddenWallets.nothingWasFound')}</SmallTitleText>
          <FootnoteText className="mt-2 text-center text-text-tertiary">
            {t('settings.hiddenWallets.updateSearch')}
          </FootnoteText>
        </div>
      );
    }

    if (hiddenWallets.length > 0) {
      return (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-2 p-2">
            <Checkbox
              checked={selectionState.allSelected}
              semiChecked={selectionState.someSelected}
              onChange={() => hiddenWalletsModel.toggleAllSelection()}
            >
              <FootnoteText className="text-text-secondary">{t('settings.hiddenWallets.allWallets')}</FootnoteText>
            </Checkbox>
          </div>

          {entries(filteredWalletsByType).map(([type, wallets]) => (
            <WalletGroup
              key={type}
              walletType={type}
              wallets={wallets ?? []}
              selectedWalletIds={selectionState.selectedWalletIds}
              onGroupToggle={hiddenWalletsModel.toggleGroupSelection}
              onWalletToggle={hiddenWalletsModel.toggleWalletSelection}
            />
          ))}
        </div>
      );
    }

    return null;
  }, [inputQuery, query, hiddenWallets, selectionState, filteredWalletsByType, t]);

  const handleRestore = async () => {
    if (hiddenWallets.length === 0) {
      return;
    }

    const restored = await hiddenWalletsModel.restoreWallets();
    if (restored.length === 0) return;

    toast.success(t('settings.hiddenWallets.restored'), {
      description: t('settings.hiddenWallets.restoredDescription'),
    });
  };

  const handleClose = () => {
    hiddenWalletsModel.clearSelection();
  };

  return (
    <Modal height="full" size="md" onToggle={handleClose}>
      <Modal.Trigger>
        <Plate className="p-0">
          <button className="flex w-full cursor-pointer items-center gap-x-2 rounded-md p-3 transition hover:shadow-card-shadow focus:shadow-card-shadow">
            <Icon className="row-span-2" name="hiddenWallet" size={36} />
            <BodyText>{t('settings.overview.hiddenWalletsLabel')}</BodyText>
          </button>
        </Plate>
      </Modal.Trigger>
      <Modal.Title close>{t('settings.hiddenWallets.modalTitle')}</Modal.Title>
      <Modal.Content>
        <section className="flex h-full flex-col space-y-4 p-4">
          {hiddenWallets.length > 0 && (
            <SearchInput
              value={inputQuery}
              placeholder={t('settings.hiddenWallets.searchPlaceholder')}
              onChange={hiddenWalletsModel.changeQuery}
            />
          )}

          {content}
        </section>
      </Modal.Content>
      <Modal.Footer align="end">
        <Button disabled={selectionState.selectedCount === 0} onClick={handleRestore}>
          {t('settings.hiddenWallets.restore')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
