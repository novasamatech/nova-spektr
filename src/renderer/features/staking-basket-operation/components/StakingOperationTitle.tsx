import { type ChainId } from '@/shared/core';
import { type ChainError, type ClientError } from '@/shared/core/types/basket';
import { type IconNames } from '@/shared/ui';
import { BasketOperationStatus } from '@/shared/ui-entities';
import { ChainTitle } from '@/entities/chain';
import { TransactionTitle } from '@/entities/transaction';

type Props = {
  title: string;
  icon: IconNames;
  chainId: ChainId;
  error?: ChainError | ClientError;
  validating?: boolean;
  errorText?: string;
};

export const StakingOperationTitle = ({ title, icon, chainId, error, errorText, validating }: Props) => {
  return (
    <>
      <TransactionTitle className="flex-1 overflow-hidden" title={title} icon={icon} />

      <ChainTitle chainId={chainId} className="w-[114px]" />

      <div className="flex w-[106px] justify-center">
        <BasketOperationStatus validating={validating} errorText={errorText} error={error} />
      </div>
    </>
  );
};
