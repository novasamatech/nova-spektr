import { memo } from 'react';

import { Accordion } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { OperationTitleDate, OperationTitleStatus } from '@/entities/operations';

import { OperationFullInfo } from './OperationFullInfo';
import { OperationTitle } from './OperationTitle';

type Props = {
  operation: MultisigOperation;
};

export const Operation = memo(({ operation }: Props) => {
  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full min-w-0 items-center gap-x-4 overflow-hidden">
          <OperationTitleDate operation={operation} />
          <OperationTitle operation={operation} variant="long" />
          <OperationTitleStatus operation={operation} />
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo operation={operation} />
      </Accordion.Content>
    </Accordion>
  );
});
