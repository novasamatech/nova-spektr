import { type ChainId } from '@/shared/core';
import { type BasketTransaction, type ChainError, type ClientError } from '@/shared/core/types/basket';
import { cnTw } from '@/shared/lib/utils';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';
import { RemoveOperation } from '@/features/basket-operations';

type Props = {
  operation: BasketTransaction;
  title: string;
  chainId: ChainId;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
};

export const FellowshipOperationTitle = ({ operation, title, chainId, error, errorText, validating }: Props) => {
  const disabled = errorText || validating;

  return (
    <div className={cnTw('flex h-[52px] w-full items-center gap-x-4 overflow-hidden', !disabled && 'cursor-pointer')}>
      <TransactionTitle className="flex-1 overflow-hidden" title={title} icon="proxyConfirm" />

      <ChainTitle chainId={chainId} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>

      <RemoveOperation operation={operation} />
    </div>
  );
};
