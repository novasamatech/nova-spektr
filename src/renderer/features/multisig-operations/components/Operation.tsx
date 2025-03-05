import { memo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/multisig';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';

import { OperationFullInfo } from './OperationFullInfo';

type Props = {
  tx: MultisigOperation;
  account: MultisigAccount | null;
};

type SlotProps = {
  operation: MultisigOperation;
};

export const operationTitleSlot = createSlot<SlotProps>();

const Operation = memo(({ tx, account }: Props) => {
  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden">
          <OperationTitleDate operation={tx} />
          <Slot id={operationTitleSlot} props={{ operation: tx }} />
          <OperationTitleStatus operation={tx} />
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo tx={tx} account={account} />
      </Accordion.Content>
    </Accordion>
  );
});

export default Operation;
