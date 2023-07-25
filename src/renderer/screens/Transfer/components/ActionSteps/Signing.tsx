import { useEffect, useState } from 'react';
import { BN, hexToU8a, u8aToHex } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import QrReaderWrapper from '@renderer/components/common/QrCode/QrReader/QrReaderWrapper';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { toAccountId } from '@renderer/shared/utils/address';
import { transferableAmount } from '@renderer/shared/utils/balance';
import { Transaction } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { AccountId, ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Balance } from '@renderer/domain/balance';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  transaction: Transaction;
  assetId: string;
  countdown: number;
  accountId: AccountId;
  txPayload?: Uint8Array;
  onStartOver: () => void;
  onGoBack: () => void;
  onResult: (signature: HexString) => void;
};

const Signing = ({
  api,
  chainId,
  transaction,
  assetId,
  countdown,
  accountId,
  txPayload,
  onGoBack,
  onStartOver,
  onResult,
}: Props) => {
  const { getBalance } = useBalance();
  const { getTransactionFee, verifySignature } = useTransaction();

  const [validationError, setValidationError] = useState<ValidationErrors>();

  useEffect(() => {
    if (countdown === 0) {
      onGoBack();
    }
  }, [countdown]);

  const getTokenBalance = (): Promise<Balance | undefined> => {
    return getBalance(toAccountId(transaction.address), chainId, assetId.toString());
  };

  const getNativeTokenBalance = (): Promise<Balance | undefined> => {
    if (assetId === '0') return Promise.resolve(undefined);

    return getBalance(toAccountId(transaction.address), chainId, '0');
  };

  const validateBalance = async (): Promise<boolean> => {
    const amount = transaction.args.value;
    const transferableBalance = transferableAmount(await getTokenBalance());

    return new BN(transferableBalance).gt(new BN(amount));
  };

  const validateBalanceForFee = async (): Promise<boolean> => {
    const amount = transaction.args.value;
    const nativeTokenBalance = await getNativeTokenBalance();
    const transferableBalance = transferableAmount(await getTokenBalance());
    const transferableNativeTokenBalance = transferableAmount(nativeTokenBalance);
    const fee = await getTransactionFee(transaction, api);

    return nativeTokenBalance
      ? new BN(transferableNativeTokenBalance).gt(new BN(fee))
      : new BN(transferableBalance).gt(new BN(fee).add(new BN(amount)));
  };

  const handleResult = async (signature: string): Promise<void> => {
    const [balanceIsEnough, feeIsEnough] = await Promise.all([validateBalance(), validateBalanceForFee()]);

    const isVerified = txPayload && verifySignature(txPayload, u8aToHex(hexToU8a(signature)), accountId);

    if (!balanceIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE);
    } else if (!feeIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);
    } else if (!isVerified) {
      setValidationError(ValidationErrors.INVALID_SIGNATURE);
    } else {
      onResult(signature as HexString);
    }
  };

  return (
    <div className="flex flex-col items-center gap-y-2.5 w-full">
      <QrReaderWrapper
        countdown={countdown}
        validationError={validationError}
        onResult={(res) => handleResult(res as string)}
        onGoBack={onGoBack}
      />
    </div>
  );
};

export default Signing;
