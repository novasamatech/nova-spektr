import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { type AccountNode, type AnyAccount, accountService, accounts } from '@/domains/network';
import { accountsStructureModel } from '../model/accountsStructureModel';

import { AccountSelector } from './AccountSelector';
import { ChainSelector } from './ChainSelector';

const AccountsStructure = lazy(() =>
  import('./AccountsStructure').then((module) => ({ default: module.AccountsStructure })),
);

type Props = {
  walletAccounts: AnyAccount[];
  onClose?: () => void;
};

export const AccountsStructureModal = ({ walletAccounts, onClose }: Props) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const selectedChain = useUnit(accountsStructureModel.$selectedChain);
  const selectedAccount = useUnit(accountsStructureModel.$selectedAccount);
  const accountList = useUnit(accounts.$list);
  const setAccounts = useUnit(accountsStructureModel.setAccounts);

  useEffect(() => {
    setAccounts(walletAccounts);
    return () => {
      setAccounts(null);
    };
  }, [walletAccounts, setAccounts]);

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
    if (!selectedChain || !selectedAccount) return null;
    return findNodesRelatedToAccount(accountList, selectedAccount, selectedChain);
  }, [accountList, selectedChain, selectedAccount]);

  return (
    <Modal size="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-[600px]">
          <div className="absolute left-4 top-4 z-10 flex gap-4">
            <div className="w-[200px]">
              <ChainSelector />
            </div>
            <div className="w-[200px]">
              <AccountSelector walletAccounts={walletAccounts} />
            </div>
          </div>

          {graph && isOpen && selectedAccount && (
            <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
              {<AccountsStructure account={selectedAccount} graph={graph} />}
            </Suspense>
          )}
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

function findNodesRelatedToAccount(
  accounts: AnyAccount[],
  account: AnyAccount,
  chain: Chain,
): Map<AnyAccount, AccountNode> {
  const graph = accountService.createAccountGraphs(accounts, chain);
  const result: Map<AnyAccount, AccountNode> = new Map();

  for (const node of graph.values()) {
    accountService.traverseGraph(node, {
      enter(child) {
        if (child.account === account) {
          result.set(node.account, node);
          return false;
        }
      },
    });
  }

  return result;
}
