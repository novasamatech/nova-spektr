import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { DEFAULT_TRANSITION } from '@/shared/lib/utils';
import { Button, FootnoteText } from '@/shared/ui';
import { Checkbox, Modal, SearchInput } from '@/shared/ui-kit';
import { WalletGroup } from '@/features/multisig-wallet';
import { hiddenWalletsModel } from '../model/hidden-wallets';

type Props = {
  onClose: () => void;
};

export const HiddenWalletsModal = ({ onClose }: Props) => {
  const { t } = useI18n();

  const query = useUnit(hiddenWalletsModel.$query);
  const regularMultisigs = useUnit(hiddenWalletsModel.$regularMultisigs);
  const selectionState = useUnit(hiddenWalletsModel.$selectionState);

  const [isModalOpen, toggleIsModalOpen] = useToggle(true);

  const closeModal = () => {
    toggleIsModalOpen();
    setTimeout(onClose, DEFAULT_TRANSITION);
  };

  const handleRestore = () => {
    if (selectionState.selectedCount > 0) {
      hiddenWalletsModel.restoreWallets();
      // closeModal();
    }
  };

  const handleClose = () => {
    hiddenWalletsModel.clearSelection();
    closeModal();
  };

  return (
    <Modal isOpen={isModalOpen} size="sm" onToggle={handleClose}>
      <Modal.Title close>{t('settings.hiddenWallets.modalTitle')}</Modal.Title>
      <Modal.Content>
        <section className="space-y-4 p-4">
          <SearchInput
            value={query}
            placeholder={t('settings.hiddenWallets.searchPlaceholder')}
            onChange={hiddenWalletsModel.changeQuery}
          />

          {regularMultisigs.length > 0 && (
            <div>
              {/* Select All Checkbox */}
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
                onSelect={() => {}} // Not used in multiple select mode
                onGroupToggle={hiddenWalletsModel.toggleGroupSelection}
                onWalletToggle={hiddenWalletsModel.toggleWalletSelection}
              />
            </div>
          )}

          {regularMultisigs.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-text-tertiary">{t('wallets.noWalletsFound')}</p>
            </div>
          )}

          <Button className="mt-3 ml-auto" disabled={selectionState.selectedCount === 0} onClick={handleRestore}>
            {t('settings.hiddenWallets.restore')}
          </Button>
        </section>
      </Modal.Content>
    </Modal>
  );
};
