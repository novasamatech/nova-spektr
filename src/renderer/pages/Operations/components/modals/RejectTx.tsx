import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { sortBy } from 'lodash';
import { useEffect, useState } from 'react';

import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import {
  type Account,
  type Address,
  type Chain,
  type FlexibleMultisigAccount,
  type HexString,
  type MultisigAccount,
  type Transaction,
} from '@/shared/core';
import { TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { getAssetById, toAddress, transferableAmount } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { OperationTitle } from '@/entities/chain';
import { networkModel } from '@/entities/network';
import { priceProviderModel } from '@/entities/price';
import {
  OperationResult,
  getMultisigSignOperationTitle,
  isXcmTransaction,
  transactionBuilder,
  transactionService,
  validateBalance,
} from '@/entities/transaction';
import { walletModel, walletUtils } from '@/entities/wallet';
import { SigningSwitch } from '@/features/operations';
import { Confirmation } from '../ActionSteps/Confirmation';
import { Submit } from '../ActionSteps/Submit';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account: MultisigAccount | FlexibleMultisigAccount;
  chain: Chain;
  api: ApiPromise;
  children: React.ReactNode;
};

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

const AllSteps = [Step.CONFIRMATION, Step.SIGNING, Step.SUBMIT];

const RejectTxModal = ({ api, tx, account, chain, children }: Props) => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const balances = useUnit(balanceModel.$balances);
  const apis = useUnit(networkModel.$apis);

  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const [activeStep, setActiveStep] = useState(Step.CONFIRMATION);

  const [rejectTx, setRejectTx] = useState<Transaction>();
  const [txPayload, setTxPayload] = useState<Uint8Array>();

  const [signature, setSignature] = useState<HexString>();

  const transactionTitle = getMultisigSignOperationTitle(
    isXcmTransaction(tx.transaction),
    t,
    TransactionType.MULTISIG_CANCEL_AS_MULTI,
    tx,
  );

  const nativeAsset = chain.assets[0];
  const asset = getAssetById(tx.transaction?.args.assetId, chain.assets);

  const signAccount = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: walletUtils.isValidSignatory,
    accountFn: (account) => account.accountId === tx.depositor,
  })?.accounts[0];

  const checkBalance = () =>
    validateBalance({
      api,
      chainId: tx.chainId,
      transaction: rejectTx,
      assetId: nativeAsset.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee: transactionService.getTransactionFee,
    });

  useEffect(() => {
    priceProviderModel.events.assetsPricesRequested({ includeRates: true });
  }, []);

  useEffect(() => {
    const accountId = signAccount?.accountId || account.signatories[0].accountId;

    setRejectTx(getMultisigTx(accountId));
  }, [tx, signAccount?.accountId]);

  const goBack = () => {
    setActiveStep(AllSteps.indexOf(activeStep) - 1);
  };

  const onSignResult = (signature: HexString[], payload: Uint8Array[]) => {
    setTxPayload(payload[0]);
    setSignature(signature[0]);
    setActiveStep(Step.SUBMIT);
  };

  const handleClose = () => {
    setActiveStep(Step.CONFIRMATION);
  };

  const getMultisigTx = (signer: Address): Transaction => {
    const signerAddress = toAddress(signer, { prefix: chain?.addressPrefix });

    const otherSignatories = account.signatories.reduce<Address[]>((acc, s) => {
      const signatoryAddress = toAddress(s.accountId, { prefix: chain?.addressPrefix });

      if (signerAddress !== signatoryAddress) {
        acc.push(signatoryAddress);
      }

      return acc;
    }, []);

    return transactionBuilder.buildRejectMultisigTx({
      chain: chain,
      signerAddress,
      threshold: account.threshold,
      otherSignatories: sortBy(otherSignatories),
      tx,
    });
  };

  const validateBalanceForFee = async (signAccount: Account): Promise<boolean> => {
    if (!api || !rejectTx || !signAccount.accountId || !nativeAsset) {
      return false;
    }

    const fee = await transactionService.getTransactionFee(rejectTx, api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      chain.chainId,
      nativeAsset.assetId.toString(),
    );

    if (!balance) {
      return false;
    }

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const cancellable = tx.status === 'SIGNING' && signAccount;
  if (!cancellable) {
    return null;
  }

  const handleConfirm = async () => {
    const isValid = await validateBalanceForFee(signAccount);

    if (isValid) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const isSubmitStep = activeStep === Step.SUBMIT && rejectTx && signAccount && signature && txPayload;

  if (isSubmitStep && api) {
    return (
      <Submit
        isReject
        tx={rejectTx}
        api={api}
        multisigTx={tx}
        account={signAccount}
        txPayload={txPayload}
        signature={signature}
        onClose={handleClose}
      />
    );
  }

  return (
    <Modal size="md" onToggle={handleClose}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>
        <OperationTitle title={t(transactionTitle, { asset: asset?.symbol })} chainId={tx.chainId} />
      </Modal.Title>
      <Modal.Content>
        {activeStep === Step.CONFIRMATION && (
          <Confirmation
            tx={tx}
            account={account}
            api={api}
            chain={chain}
            feeTx={rejectTx}
            signAccount={signAccount}
            onSign={handleConfirm}
          />
        )}
        {activeStep === Step.SIGNING && rejectTx && api && signAccount && (
          <SigningSwitch
            signerWallet={wallets.find((w) => w.id === signAccount.walletId)}
            apis={apis}
            signingPayloads={[
              {
                chain: chain,
                account: signAccount,
                transaction: rejectTx,
                signatory: signAccount,
              },
            ]}
            validateBalance={checkBalance}
            onGoBack={goBack}
            onResult={onSignResult}
          />
        )}

        <OperationResult
          isOpen={isFeeModalOpen}
          variant="error"
          title={t('operation.feeErrorTitle')}
          description={t('operation.feeErrorMessage')}
          onClose={toggleFeeModal}
        >
          <Button onClick={toggleFeeModal}>{t('operation.submitErrorButton')}</Button>
        </OperationResult>
      </Modal.Content>
    </Modal>
  );
};

export default RejectTxModal;
