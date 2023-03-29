import { useState } from 'react';
import { BN } from '@polkadot/util';
import { ApiPromise } from '@polkadot/api';

import { useI18n } from '@renderer/context/I18nContext';
import { Plate, Block, Button } from '@renderer/components/ui';
import ParitySignerSignatureReader from '@renderer/screens/Signing/ParitySignerSignatureReader/ParitySignerSignatureReader';
import { ValidationErrors } from '@renderer/shared/utils/validation';
import { toPublicKey } from '@renderer/shared/utils/address';
import { transferableAmount } from '@renderer/services/balance/common/utils';
import { Transaction } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { ChainId, HexString } from '@renderer/domain/shared-kernel';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { Balance } from '@renderer/domain/balance';
import { ActiveAddress } from '@renderer/screens/Transfer/components';
import { Explorer } from '@renderer/domain/chain';

type Props = {
  api: ApiPromise;
  chainId: ChainId;
  transaction: Transaction;
  accountName: string;
  assetId: string;
  countdown: number;
  explorers?: Explorer[];
  addressPrefix: number;
  onGoBack: () => void;
  onStartOver: () => void;
  onResult: (signature: HexString) => void;
};

export const Signing = ({
  api,
  chainId,
  transaction,
  accountName,
  assetId,
  countdown,
  explorers,
  addressPrefix,
  onGoBack,
  onStartOver,
  onResult,
}: Props) => {
  const { t } = useI18n();
  const { getBalance } = useBalance();
  const { getTransactionFee } = useTransaction();

  const [validationError, setValidationError] = useState<ValidationErrors>();

  const getTokenBalance = (): Promise<Balance | undefined> => {
    const address = transaction.address;
    const publicKey = toPublicKey(address) || '0x0';

    return getBalance(publicKey, chainId, assetId.toString());
  };

  const getNativeTokenBalance = (): Promise<Balance | undefined> => {
    if (assetId === '0') return Promise.resolve(undefined);

    const address = transaction.address;
    const publicKey = toPublicKey(address) || '0x0';

    return getBalance(publicKey, chainId, '0');
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

    if (!balanceIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE);
    } else if (!feeIsEnough) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);
    } else {
      onResult(signature as HexString);
    }
  };

  return (
    <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-y-2.5">
      <Block>
        <ActiveAddress
          address={transaction.address}
          accountName={accountName}
          explorers={explorers}
          addressPrefix={addressPrefix}
        />
      </Block>

      <Block className="flex flex-col items-center gap-y-2.5 p-5">
        <div className="text-neutral-variant text-base font-semibold">{t('signing.scanSignatureTitle')}</div>
        <div className="h-[460px]">
          <ParitySignerSignatureReader
            className="w-full rounded-2lg"
            countdown={countdown}
            size={460}
            validationError={validationError}
            onResult={handleResult}
          />
        </div>
      </Block>

      {countdown === 0 && (
        <Button variant="fill" pallet="primary" weight="lg" onClick={onGoBack}>
          {t('signing.generateNewQrButton')}
        </Button>
      )}

      {validationError && (
        <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={onStartOver}>
          {t('transfer.editOperationButton')}
        </Button>
      )}
    </Plate>
  );
};
