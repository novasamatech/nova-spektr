import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { BN } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Account, HexString, MultisigAccount, ProxyAccount } from '@shared/core';
import { OperationTitle } from '@entities/chain';
import { BaseModal, Button, Loader } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Confirmation } from './Confirmation';
import { networkModel, useNetworkData } from '@entities/network';
import { OperationResult, TransactionType, useTransaction, validateBalance } from '@entities/transaction';
import { Signing } from '@features/operation';
import { toAddress, transferableAmount } from '@shared/lib/utils';
import { SignatorySelectModal } from '@pages/Operations/components/modals/SignatorySelectModal';
import { useToggle } from '@shared/lib/hooks';
import { balanceModel, balanceUtils } from '@entities/balance';
import { Submit } from './Submit';
import { removeProxyModel, Step } from '@widgets/RemoveProxy/model/remove-proxy-model';
import { accountUtils } from '@entities/wallet';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  proxyAccount: ProxyAccount | null;
};

export const RemoveProxy = ({ isOpen, proxyAccount, onClose }: Props) => {
  const { t } = useI18n();

  if (!proxyAccount) return null;

  const proxiedAccount = useUnit(removeProxyModel.$proxiedAccount);
  const proxiedWallet = useUnit(removeProxyModel.$proxiedWallet);
  const activeStep = useUnit(removeProxyModel.$activeStep);
  const signatory = useUnit(removeProxyModel.$signatory);
  const unsignedTx = useUnit(removeProxyModel.$unsignedTx);
  const signature = useUnit(removeProxyModel.$signature);
  const signatories = useUnit(removeProxyModel.$signatories);
  const chain = useUnit(networkModel.$chains)[proxyAccount.chainId];

  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();

  const balances = useUnit(balanceModel.$balances);

  const { api, extendedChain } = useNetworkData(chain.chainId);
  const { getTransactionFee, setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();

  const nativeToken = chain.assets[0];
  const transaction = txs[0];
  const { addressPrefix } = chain;
  const isMultisigAccount = proxiedAccount && accountUtils.isMultisigAccount(proxiedAccount);

  useEffect(() => {
    setTxs([
      buildTransaction(
        TransactionType.REMOVE_PROXY,
        toAddress(proxyAccount.proxiedAccountId, { prefix: addressPrefix }),
        chain.chainId,
        {
          delegate: toAddress(proxyAccount.accountId, { prefix: addressPrefix }),
          proxyType: proxyAccount.proxyType,
          delay: proxyAccount.delay,
        },
      ),
    ]);

    removeProxyModel.events.removeStarted({ proxyAccount, chain });
  }, [proxyAccount]);

  useEffect(() => {
    if (signatory && proxiedAccount) {
      setWrappers([
        {
          signatoryId: signatory.accountId,
          account: proxiedAccount as MultisigAccount,
        },
      ]);
    }
  }, [proxiedAccount, signatory]);

  const validateBalanceForFee = async (signAccount: Account): Promise<boolean> => {
    if (!extendedChain.api || !transaction || !signAccount.accountId || !nativeToken) return false;

    const fee = await getTransactionFee(transaction, extendedChain.api);
    const balance = balanceUtils.getBalance(
      balances,
      signAccount.accountId,
      extendedChain.chainId,
      nativeToken.assetId.toString(),
    );

    if (!balance) return false;

    return new BN(fee).lte(new BN(transferableAmount(balance)));
  };

  const selectSignatoryAccount = async (account: Account) => {
    toggleSelectAccountModal();

    const isValid = await validateBalanceForFee(account);

    if (isValid) {
      removeProxyModel.events.signatorySelected(account);
    } else {
      toggleFeeModal();
    }
  };

  const handleConfirmation = () => {
    if (isMultisigAccount) {
      trySetSignatoryAccount();
    } else {
      removeProxyModel.events.activeStepChanged(Step.SIGNING);
    }
  };

  const trySetSignatoryAccount = () => {
    if (signatories?.length === 1) {
      removeProxyModel.events.signatorySelected(signatories[0]);
    } else {
      toggleSelectAccountModal();
    }
  };

  const onSignResult = (signature: HexString[], tx: UnsignedTransaction[]) => {
    removeProxyModel.events.transactionSigned({ unsignedTx: tx[0], signature: signature[0] });
  };

  const checkBalance = () =>
    validateBalance({
      api: extendedChain.api,
      chainId: extendedChain.chainId,
      transaction: transaction,
      assetId: nativeToken.assetId.toString(),
      getBalance: balanceUtils.getBalanceWrapped(balances),
      getTransactionFee,
    });

  if (activeStep === Step.SUBMIT) {
    return api ? (
      <Submit
        tx={transaction}
        multisigTx={isMultisigAccount ? wrapTx(transaction, api, addressPrefix) : undefined}
        account={proxiedAccount}
        unsignedTx={unsignedTx}
        signature={signature}
        api={api}
        onSubmitted={() => removeProxyModel.events.proxyRemoved(api)}
        onClose={onClose}
      />
    ) : (
      <div className="w-[240px] h-[200px] px-5 py-4">
        <Loader className="my-24 mx-auto" color="primary" size={25} />
      </div>
    );
  }

  return (
    <BaseModal
      closeButton
      isOpen={isOpen}
      title={
        <OperationTitle
          className="max-w-[380px]"
          title={t('proxy.operations.removeProxyTitle')}
          chainId={chain.chainId}
        />
      }
      contentClass=""
      panelClass="w-[440px]"
      headerClass="py-3 pl-5 pr-3"
      onClose={onClose}
    >
      {activeStep === Step.CONFIRMATION && (
        <Confirmation
          transaction={transaction}
          proxyAccount={proxyAccount}
          proxiedAccount={proxiedAccount}
          proxiedWallet={proxiedWallet}
          connection={extendedChain}
          onResult={handleConfirmation}
          onBack={onClose}
        />
      )}

      {activeStep === Step.SIGNING && proxiedAccount && (
        <Signing
          signerWaller={proxiedWallet}
          chainId={chain.chainId}
          api={api}
          addressPrefix={addressPrefix}
          accounts={[proxiedAccount]}
          signatory={signatory || undefined}
          transactions={[wrapTx(transaction, api, addressPrefix)]}
          validateBalance={checkBalance}
          onGoBack={() => removeProxyModel.events.activeStepChanged(Step.CONFIRMATION)}
          onResult={onSignResult}
        />
      )}

      {signatories && (
        <SignatorySelectModal
          isOpen={isSelectAccountModalOpen}
          accounts={signatories}
          chain={extendedChain}
          nativeAsset={nativeToken}
          onClose={toggleSelectAccountModal}
          onSelect={selectSignatoryAccount}
        />
      )}

      <OperationResult
        isOpen={isFeeModalOpen}
        variant="error"
        title={t('operation.feeErrorTitle')}
        description={t('operation.feeErrorMessage')}
        onClose={toggleFeeModal}
      >
        <Button onClick={toggleFeeModal}>{t('operation.feeErrorButton')}</Button>
      </OperationResult>
    </BaseModal>
  );
};
