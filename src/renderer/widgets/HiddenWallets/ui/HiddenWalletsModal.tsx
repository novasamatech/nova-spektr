import { useUnit } from 'effector-react';
import noop from 'lodash/noop';
import { useEffect, useMemo, useState } from 'react';

import { useNotification } from '@/app/providers';
import { type Wallet, WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, SmallTitleText } from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { Box, Checkbox, Modal, SearchInput } from '@/shared/ui-kit';
import { WalletGroup } from '@/features/multisig-wallet';
import { hiddenWalletsModel } from '../model/hidden-wallets';

type Props = {
  onClose: () => void;
};

export const HiddenWalletsModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const notification = useNotification();

  const inputQuery = useUnit(hiddenWalletsModel.$inputQuery);
  const query = useUnit(hiddenWalletsModel.$query);
  const selectionState = useUnit(hiddenWalletsModel.$selectionState);

  const regularMultisigs = useUnit(hiddenWalletsModel.$regularMultisigs);
  const [multisigSearchResults, setMultisigSearchResults] = useState<Wallet[]>([]);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    const unsubscribe = hiddenWalletsModel.walletsRestored.watch(() => {
      closeModal();

      notification.modal({
        content: (
          <Box width={60} padding={4} gap={1} verticalAlign="center" horizontalAlign="center">
            <Animation variant="success" width={80} height={80} />
            <SmallTitleText>{t('settings.hiddenWallets.restored')}</SmallTitleText>
            <FootnoteText className="text-center text-text-secondary">
              {t('settings.hiddenWallets.restoredDescription')}
            </FootnoteText>
          </Box>
        ),
        height: 'fit',
        size: 'fit',
        duration: 3000,
      });
    });

    return unsubscribe;
  }, [notification, t]);

  const handleRestore = () => {
    if (regularMultisigs.length === 0) {
      return;
    }

    hiddenWalletsModel.restoreWallets();
  };

  const handleClose = () => {
    hiddenWalletsModel.clearSelection();
    closeModal();
  };

  const content = useMemo(() => {
    if (regularMultisigs.length === 0) {
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

    if (regularMultisigs.length > 0 && multisigSearchResults.length === 0 && inputQuery.length > 0) {
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

    if (regularMultisigs.length > 0) {
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

          <WalletGroup
            isMultipleSelect
            title={t('wallets.multisigLabel')}
            walletType={WalletType.MULTISIG}
            wallets={regularMultisigs}
            query={query}
            selectedWalletIds={selectionState.selectedWalletIds}
            setSearchResults={setMultisigSearchResults}
            onSelect={noop}
            onGroupToggle={hiddenWalletsModel.toggleGroupSelection}
            onWalletToggle={hiddenWalletsModel.toggleWalletSelection}
          />
        </div>
      );
    }

    return null;
  }, [inputQuery, query, regularMultisigs, selectionState, multisigSearchResults, t]);

  return (
    <Modal isOpen={isModalOpen} height="full" size="md" onToggle={handleClose}>
      <Modal.Title close>{t('settings.hiddenWallets.modalTitle')}</Modal.Title>
      <Modal.Content>
        <section className="flex h-full flex-col space-y-4 p-4">
          {regularMultisigs.length > 0 && (
            <SearchInput
              value={inputQuery}
              placeholder={t('settings.hiddenWallets.searchPlaceholder')}
              onChange={hiddenWalletsModel.changeQuery}
            />
          )}

          {content}

          <Button className="mt-3 ml-auto" disabled={selectionState.selectedCount === 0} onClick={handleRestore}>
            {t('settings.hiddenWallets.restore')}
          </Button>
        </section>
      </Modal.Content>
    </Modal>
  );
};
