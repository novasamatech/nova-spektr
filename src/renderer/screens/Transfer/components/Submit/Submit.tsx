import { ApiPromise } from '@polkadot/api';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Balance, Icon, Address, Plate, Block } from '@renderer/components/ui';
import { Explorers, Fee, Message, Deposit } from '@renderer/components/common';
import { Asset } from '@renderer/domain/asset';
import { useI18n } from '@renderer/context/I18nContext';
import { Transaction } from '@renderer/domain/transaction';
import { Explorer } from '@renderer/domain/chain';
import { HexString } from '@renderer/domain/shared-kernel';
import { useToggle } from '@renderer/shared/hooks';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { useMatrix } from '@renderer/context/MatrixContext';
import { Account, MultisigAccount, isMultisig } from '@renderer/domain/account';

type Props = {
  api: ApiPromise;
  asset: Asset;
  nativeToken: Asset;
  icon: string;
  network: string;
  account?: Account | MultisigAccount;
  description?: string;
  transferTx: Transaction;
  multisigTx?: Transaction;
  explorers?: Explorer[];
  addressPrefix: number;
  unsignedTx: UnsignedTransaction;
  signature: HexString;
};

export const Submit = ({
  api,
  asset,
  nativeToken,
  icon,
  network,
  account,
  description,
  transferTx,
  multisigTx,
  explorers,
  addressPrefix,
  unsignedTx,
  signature,
}: Props) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { matrix } = useMatrix();
  const { submitAndWatchExtrinsic, getSignedExtrinsic } = useTransaction();

  const [inProgress, toggleInProgress] = useToggle(true);
  const [successMessage, toggleSuccessMessage] = useToggle();
  const [errorMessage, setErrorMessage] = useState('');

  const address = transferTx.address;
  const destination = transferTx.args.dest;
  const balance = transferTx.args.value;
  const threshold = multisigTx?.args.threshold;
  const accountType = isMultisig(account) ? 'multisigBg' : 'paritySignerBg';

  const submitExtrinsic = async (signature: HexString) => {
    const extrinsic = await getSignedExtrinsic(unsignedTx, signature, api);

    submitAndWatchExtrinsic(extrinsic, unsignedTx, api, async (executed, params) => {
      if (executed) {
        if (multisigTx && isMultisig(account)) {
          await sendMstApproval(account.matrixRoomId, multisigTx, params);
        }

        toggleSuccessMessage();
      } else {
        setErrorMessage(params as string);
      }
      toggleInProgress();
    });
  };

  const sendMstApproval = async (roomId: string, transaction: Transaction, params: any): Promise<void> => {
    try {
      await matrix.mstApprove(roomId, {
        senderAddress: transaction.address,
        chainId: transaction.chainId,
        callHash: transaction.args.callHash,
        callData: transaction.args.callData,
        extrinsicHash: params.extrinsicHash,
        extrinsicTimepoint: params.timepoint,
        callTimepoint: params.timepoint,
        error: false,
        description,
      });
    } catch (error) {
      console.warn(error);
    }
  };

  useEffect(() => {
    submitExtrinsic(signature);
  }, []);

  return (
    <>
      <Plate as="section" className="w-[500px] flex flex-col items-center mx-auto gap-y-5">
        <Block>
          <p className="font-semibold text-xl text-neutral mb-5 m-auto w-fit">{t('transferDetails.title')}</p>
          <div className="font-bold text-4.5xl text-neutral m-auto w-fit">
            {'-'}
            <Balance className="inline-block" value={balance} precision={asset.precision} symbol={asset.symbol} />
          </div>

          <div className="mt-10 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
            <div className="flex justify-between px-5 py-3">
              <div className="text-sm text-neutral-variant ">{t('transferDetails.fromNetwork')}</div>
              <div className="flex gap-1 items-center font-semibold">
                <img src={icon} alt="" width={16} height={16} />
                {network}
              </div>
            </div>
            <div className="flex justify-between px-5 py-3">
              <div className="text-sm text-neutral-variant ">{t('transferDetails.wallet')}</div>
              <div className="flex gap-1 items-center font-semibold">
                <Icon name={accountType} size={16} />
                {account?.name}
              </div>
            </div>
            <div className="flex justify-between px-5 py-3">
              <div className="text-sm text-neutral-variant ">{t('transferDetails.sender')}</div>
              <div className="flex gap-1 items-center font-semibold">
                <Address type="short" address={address} addressStyle="large" size={18} />
                <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
              </div>
            </div>
          </div>
          <div className="mt-5 bg-shade-2 rounded-2lg border border-shade-5 divide-y">
            <div className="flex justify-between px-5 py-3">
              <div className="text-sm text-neutral-variant ">{t('transferDetails.networkFee')}</div>
              <div className="flex gap-1 items-center">
                <div className="flex gap-1 items-center font-semibold">
                  <Fee api={api} asset={nativeToken} transaction={transferTx} />
                </div>
              </div>
            </div>
            {multisigTx && (
              <div className="flex justify-between px-5 py-3">
                <div className="text-sm text-neutral-variant ">{t('transferDetails.networkDeposit')}</div>
                <div className="flex gap-1 items-center">
                  <div className="flex gap-1 items-center font-semibold">
                    <Deposit api={api} asset={nativeToken} threshold={threshold} />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between px-5 py-3">
              <div className="text-sm text-neutral-variant ">{t('transferDetails.recipient')}</div>
              <div className="flex gap-1 items-center">
                <div className="flex gap-1 items-center font-semibold">
                  <Address type="short" address={destination} addressStyle="large" size={18} />
                  <Explorers explorers={explorers} addressPrefix={addressPrefix} address={address} />
                </div>
              </div>
            </div>
          </div>
        </Block>

        {inProgress && (
          <div className="flex items-center gap-x-2.5 mx-auto">
            <Icon className="text-neutral-variant animate-spin" name="loader" size={20} />
            <p className="text-neutral-variant font-semibold">{t('transfer.executing')}</p>
          </div>
        )}
      </Plate>

      <Message
        isOpen={successMessage}
        onClose={() => {
          toggleSuccessMessage();
          navigate(-1);
        }}
      >
        <div className="flex uppercase items-center gap-2.5">
          <Icon name="checkmarkCutout" size={20} className="text-success" />
          {t('transfer.successMessage')}
        </div>
      </Message>

      <Message
        isOpen={Boolean(errorMessage)}
        onClose={() => {
          setErrorMessage('');
          navigate(-1);
        }}
      >
        <div className="flex uppercase items-center gap-2.5">
          <Icon name="warnCutout" size={20} className="text-error" />
          {errorMessage}
        </div>
      </Message>
    </>
  );
};
