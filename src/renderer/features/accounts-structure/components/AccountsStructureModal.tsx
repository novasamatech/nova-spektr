import '@xyflow/react/dist/style.css';

import { useUnit } from 'effector-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';

import { type Chain } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { Modal, Select } from '@/shared/ui-kit';
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
  const pathType = useUnit(accountsStructureModel.$pathType);
  const edgeType = useUnit(accountsStructureModel.$edgeType);

  useEffect(() => {
    accountsStructureModel.setAccounts(walletAccounts);
    return () => {
      accountsStructureModel.setAccounts(null);
    };
  }, [walletAccounts]);

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
    <Modal height="full" size="full" isOpen={isOpen} onToggle={onToggle}>
      <Modal.Trigger>
        <Button pallet="secondary" size="sm" variant="fill">
          {t('accountsStructure.button')}
        </Button>
      </Modal.Trigger>

      <Modal.Title close>{t('accountsStructure.modalTitle')}</Modal.Title>
      <Modal.Content>
        <div className="relative h-full">
          <div className="absolute left-4 top-4 z-10 flex gap-4">
            <div className="w-[200px]">
              <ChainSelector />
            </div>

            <div className="w-[200px]">
              <AccountSelector walletAccounts={walletAccounts} />
            </div>

            <div className="w-[200px]">
              <Select value={pathType} placeholder="Path type" onChange={(v) => accountsStructureModel.setPathType(v)}>
                <Select.Item value="straight">{t('Straight Line')}</Select.Item>
                <Select.Item value="bezier">{t('Bezier Curve')}</Select.Item>
                <Select.Item value="smoothStep">{t('Smooth Step')}</Select.Item>
              </Select>
            </div>

            <div className="w-[200px]">
              <Select value={edgeType} placeholder="Edge type" onChange={(v) => accountsStructureModel.setEdgeType(v)}>
                <Select.Item value="solid">{t('Solid')}</Select.Item>
                <Select.Item value="dashed">{t('Dashed')}</Select.Item>
              </Select>
            </div>

            <div className="flex items-center">
              <Button
                size="sm"
                variant="fill"
                pallet="secondary"
                onClick={() => accountsStructureModel.focusOnSelected()}
              >
                {t('Focus on selected')}
              </Button>
            </div>
          </div>

          {graph && isOpen && selectedAccount && (
            <Suspense fallback={<div className="flex h-full items-center justify-center">Loading...</div>}>
              {<AccountsStructure account={selectedAccount} graph={graph} pathType={pathType} edgeType={edgeType} />}
            </Suspense>
          )}
        </div>
      </Modal.Content>
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
