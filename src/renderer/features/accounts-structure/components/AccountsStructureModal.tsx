import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { type ReactNode, Suspense, lazy, useCallback, useEffect, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal, Select } from '@/shared/ui-kit';
import { type AnyAccount } from '@/domains/network';
import { accountsStructureModel } from '../model/accountsStructureModel';

import { AccountSelector } from './AccountSelector';
import { ChainSelector } from './ChainSelector';

const AccountsStructure = lazy(() =>
  import('./AccountsStructure').then((module) => ({ default: module.AccountsStructure })),
);

type Props = {
  walletAccounts: AnyAccount[];
  initialChainId?: string;
  exclusive?: boolean;
  trigger?: ReactNode;
  onClose?: () => void;
};

export const AccountsStructureModal = ({ walletAccounts, initialChainId, exclusive, trigger, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const pathType = useUnit(accountsStructureModel.$pathType);
  const edgeType = useUnit(accountsStructureModel.$edgeType);

  const allChainsMap = useUnit(accountsStructureModel.$allChainsMap);

  useEffect(() => {
    if (isOpen) {
      accountsStructureModel.setExclusive(exclusive ?? false);
      accountsStructureModel.setAccounts(walletAccounts);
    }
    return () => {
      if (isOpen) {
        accountsStructureModel.setAccounts(null);
        accountsStructureModel.setExclusive(false);
      }
    };
  }, [walletAccounts, isOpen, exclusive]);

  useEffect(() => {
    if (!isOpen) return;

    if (initialChainId) {
      const chain = allChainsMap.get(initialChainId as never) ?? null;
      if (chain) {
        accountsStructureModel.selectChain(chain);
      }
    }

    // First passed account wins — auto-select cascade can land elsewhere.
    const initialAccount = walletAccounts.at(0);
    if (initialAccount) {
      accountsStructureModel.selectAccount(initialAccount);
    }
  }, [isOpen, initialChainId, allChainsMap, walletAccounts]);

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOpen(value);
      if (!value) {
        onClose?.();
      }
    },
    [onClose],
  );

  return (
    <Modal height="full" size="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>
        {trigger ?? (
          <Button pallet="secondary" size="sm" variant="fill">
            {t('accountsStructure.button')}
          </Button>
        )}
      </Modal.Trigger>

      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-full">
          <div className="absolute top-4 z-10 flex w-full justify-between px-4">
            <div className="flex gap-4">
              <div className="w-[200px]">
                <ChainSelector />
              </div>

              <div className="w-[200px]">
                <AccountSelector />
              </div>

              <div className="flex items-center">
                <Button size="sm" variant="text" onClick={() => accountsStructureModel.focusOnSelected()}>
                  {t('accountsStructure.toolbar.focusOnSelected')}
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center">
                <Button size="sm" variant="text" onClick={() => accountsStructureModel.reset()}>
                  {t('accountsStructure.toolbar.reset')}
                </Button>
              </div>

              <div className="w-[120px]">
                <Select
                  value={pathType}
                  placeholder={t('accountsStructure.toolbar.pathType.placeholder')}
                  onChange={(v) => accountsStructureModel.setPathType(v)}
                >
                  <Select.Item value="straight">{t('accountsStructure.toolbar.pathType.straight')}</Select.Item>
                  <Select.Item value="bezier">{t('accountsStructure.toolbar.pathType.bezier')}</Select.Item>
                  <Select.Item value="smoothStep">{t('accountsStructure.toolbar.pathType.smoothStep')}</Select.Item>
                </Select>
              </div>

              <div className="w-[120px]">
                <Select
                  value={edgeType}
                  placeholder={t('accountsStructure.toolbar.edgeType.placeholder')}
                  onChange={(v) => accountsStructureModel.setEdgeType(v)}
                >
                  <Select.Item value="solid">{t('accountsStructure.toolbar.edgeType.solid')}</Select.Item>
                  <Select.Item value="dashed">{t('accountsStructure.toolbar.edgeType.dashed')}</Select.Item>
                </Select>
              </div>
            </div>
          </div>

          {isOpen && (
            <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
              {<AccountsStructure />}
            </Suspense>
          )}
        </div>
      </Modal.Content>
    </Modal>
  );
};
