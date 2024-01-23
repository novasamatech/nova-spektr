import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import { BN } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';

import { Account, Chain, HexString, MultisigAccount, ProxyAccount } from '@shared/core';
import { OperationTitle } from '@entities/chain';
import { BaseModal, Button, Loader } from '@shared/ui';
import { useI18n } from '@app/providers';
import { Confirmation } from './Confirmation';
import { useNetworkData } from '@entities/network';
import { OperationResult, TransactionType, useTransaction, validateBalance } from '@entities/transaction';
import { Signing } from '@features/operation';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';
import { dictionary, toAddress, transferableAmount } from '@shared/lib/utils';
import { getSignatoryAccounts } from '@pages/Operations/common/utils';
import { SignatorySelectModal } from '@pages/Operations/components/modals/SignatorySelectModal';
import { useToggle } from '@shared/lib/hooks';
import { balanceModel, balanceUtils } from '@entities/balance';
import { Submit } from './Submit';

const enum Step {
  CONFIRMATION,
  SIGNING,
  SUBMIT,
}

type Props = {
  isOpen: boolean;
  chain: Chain;
  onClose: () => void;
  proxyAccount: ProxyAccount;
};

export const RemoveProxy = ({ isOpen, proxyAccount, chain, onClose }: Props) => {
  const { t } = useI18n();

  const [activeStep, setActiveStep] = useState<Step>(Step.CONFIRMATION);
  const [isSelectAccountModalOpen, toggleSelectAccountModal] = useToggle();
  const [isFeeModalOpen, toggleFeeModal] = useToggle();
  const [signatory, setSignatory] = useState<Account>();

  const [unsignedTx, setUnsignedTx] = useState<UnsignedTransaction>({} as UnsignedTransaction);
  const [signature, setSignature] = useState<HexString>('0x0');

  const balances = useUnit(balanceModel.$balances);

  const wallets = useUnit(walletModel.$wallets);
  const accounts = useUnit(walletModel.$accounts);

  const { api, extendedChain } = useNetworkData(chain.chainId);
  const { getTransactionFee, setTxs, txs, setWrappers, wrapTx, buildTransaction } = useTransaction();

  const walletsMap = dictionary(wallets, 'id');
  const proxiedAccount = accounts.find(
    (a) => a.accountId === proxyAccount.proxiedAccountId && !walletUtils.isWatchOnly(walletsMap[a.walletId]),
  );

  if (!proxiedAccount) return null;

  const nativeToken = chain.assets[0];
  const isMultisigAccount = accountUtils.isMultisigAccount(proxiedAccount);

  const proxiedWallet = walletsMap[proxiedAccount?.walletId];

  const transaction = txs[0];
  const { addressPrefix } = chain;

  const signatories = isMultisigAccount
    ? getSignatoryAccounts(accounts, wallets, [], proxiedAccount.signatories, chain.chainId)
    : undefined;

  useEffect(() => {
    if (!extendedChain) return;
    const proxyAddress = toAddress(proxyAccount.accountId, { prefix: addressPrefix });

    setTxs([
      buildTransaction(TransactionType.REMOVE_PROXY, proxyAddress, extendedChain.chainId, {
        delegate: proxyAddress,
        proxyType: proxyAccount.proxyType,
      }),
    ]);
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
    setSignatory(account);
    toggleSelectAccountModal();

    const isValid = await validateBalanceForFee(account);

    if (isValid) {
      setActiveStep(Step.SIGNING);
    } else {
      toggleFeeModal();
    }
  };

  const handleConfirmation = () => {
    if (isMultisigAccount) {
      trySetSignatoryAccount();
    } else {
      setActiveStep(Step.SIGNING);
    }
  };

  const trySetSignatoryAccount = () => {
    if (signatories?.length === 1) {
      setSignatory(signatories[0]);
      setActiveStep(Step.SIGNING);
    } else {
      toggleSelectAccountModal();
    }
  };

  const onSignResult = (signature: HexString[], tx: UnsignedTransaction[]) => {
    setUnsignedTx(tx[0]);
    setSignature(signature[0]);
    setActiveStep(Step.SUBMIT);
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
        account={signatory || proxiedAccount}
        unsignedTx={unsignedTx}
        signature={signature}
        api={api}
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
      title={<OperationTitle title={t('proxy.operations.removeProxyTitle')} chainId={chain.chainId} />}
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

      {activeStep === Step.SIGNING && (
        <Signing
          walletForSigning={proxiedWallet}
          chainId={chain.chainId}
          api={api}
          addressPrefix={addressPrefix}
          accounts={[proxiedAccount]}
          signatory={signatory}
          transactions={[wrapTx(transaction, api, addressPrefix)]}
          validateBalance={checkBalance}
          onGoBack={() => setActiveStep(Step.CONFIRMATION)}
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
