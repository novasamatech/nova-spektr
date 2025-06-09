import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { useCallback, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AccountNode, type AnyAccount, accountService, accounts } from '@/domains/network';
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

  console.log({ selectedChain });

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOpen(value);

      if (!value) {
        onClose?.();
      }
    },
    [onClose],
  );

  const accountGraph = useMemo(() => {
    if (!selectedChain || !account) return new Map();
    const graph = accountService.createAccountGraphs(accountList, selectedChain);
    const firstAccountData = graph.get(account);
    if (!firstAccountData) return new Map();

    console.log({ firstAccountData });

    const filteredGraph = new Map<string, AccountNode>();
    filteredGraph.set(account.id, firstAccountData);
    return filteredGraph;
  }, [accountList, selectedChain, account]);

  return (
    <Modal size="lg" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-[600px]">
          <div className="absolute left-2 top-2 z-10 w-[200px]">
            <ChainSelector />
          </div>

          <AccountsStructure accountGraph={accountGraph} />
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
