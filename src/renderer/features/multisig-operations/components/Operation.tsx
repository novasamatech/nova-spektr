import { memo } from 'react';

import { type MultisigAccount } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';

import { OperationFullInfo } from './OperationFullInfo';

type Props = {
  operation: MultisigOperation;
  account: MultisigAccount | null;
};

type SlotProps = {
  operation: MultisigOperation;
};

export const operationTitleSlot = createSlot<SlotProps>();

export const Operation = memo(({ operation, account }: Props) => {
  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden">
          <OperationTitleDate operation={operation} />
          <Slot id={operationTitleSlot} props={{ operation: operation }} />
          <OperationTitleStatus operation={operation} />
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} account={account} />
      </Accordion.Content>
    </Accordion>
  );
});
