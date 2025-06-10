import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountsStructureModel } from '../model/accountsStructureModel';

import { AccountsStructure } from './AccountsStructure';
import { ChainSelector } from './ChainSelector';

type Props = {
  account: AnyAccount;
  onClose?: () => void;
};

export const AccountsStructureModal = ({ account, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const selectedChain = useUnit(accountsStructureModel.$selectedChain);
  const accountList = useUnit(accounts.$list);

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOpen(value);

      if (!value) {
        onClose?.();
      }
    },
    [onClose],
  );

  const graph = useMemo(() => {
    if (!selectedChain) return null;
    return accountService.createAccountGraphs(accountList, selectedChain);
  }, [accountList, selectedChain]);

  const rootNode = useMemo(() => {
    if (!graph || !account) return null;
    return graph.get(account) ?? null;
  }, [graph, account]);

  console.log({ rootNode });

  return (
    <Modal size="lg" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-[600px]">
          <div className="absolute left-4 top-4 z-10 w-[200px]">
            <ChainSelector />
          </div>

          <AccountsStructure rootNode={rootNode} />
        </div>
      </Modal.Content>
      <Modal.Trigger>
        <Button pallet="secondary" size="sm" variant="fill">
          {t('accountsStructure.button')}
        </Button>
      </Modal.Trigger>
    </Modal>
  );
};
