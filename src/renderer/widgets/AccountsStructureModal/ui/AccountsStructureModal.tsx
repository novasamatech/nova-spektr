import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type Chain } from '@/shared/core';
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
  const setAccount = useUnit(accountsStructureModel.events.setAccount);

  useEffect(() => {
    setAccount(account);
    return () => {
      setAccount(null);
    };
  }, [account, setAccount]);

  const onToggle = useCallback(
    (value: boolean) => {
      setIsOpen(value);

      if (!value) {
        onClose?.();
      }
    },
    [onClose],
  );

  // const graph = useMemo(() => {
  //   if (!selectedChain) return null;
  //   return accountService.createAccountGraphs(accountList, selectedChain);
  // }, [accountList, selectedChain]);

  const graph = useMemo(() => {
    if (!selectedChain) return null;
    return findNodesRelatedToAccount(accountList, account, selectedChain);
  }, [accountList, selectedChain]);

  console.log({ graph });

  // const rootNode = useMemo(() => {
  //   if (!graph || !account) return null;
  //   return graph.get(account) ?? null;
  // }, [graph, account]);

  return (
    <Modal size="lg" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-[600px]">
          <div className="absolute left-4 top-4 z-10 w-[200px]">
            <ChainSelector account={account} />
          </div>

          {graph && <AccountsStructure account={account} graph={graph} />}
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
