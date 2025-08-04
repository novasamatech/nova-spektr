import { createTransformer, useTransformer } from '@/shared/di';
import { Icon, type IconNames } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';

export const operationIconTransformer = createTransformer<{ operation: MultisigOperation }, IconNames>();

type Props = {
  operation: MultisigOperation;
};

export const OperationIcon = ({ operation }: Props) => {
  const icon = useTransformer(operationIconTransformer, { operation });
  return (
    <div className="box-content flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-token-container-border">
      <Icon name={icon || 'unknownMst'} size={20} />
    </div>
  );
};
