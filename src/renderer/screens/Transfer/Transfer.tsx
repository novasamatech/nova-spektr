import { BN, BN_THOUSAND } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { QrTxGenerator } from '@renderer/components/common';
import { Address, Button, ButtonBack, Dropdown, Icon } from '@renderer/components/ui';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { ChainId, HexString, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, toAddress, transferable } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { formatAddress, toPublicKey, validateAddress } from '@renderer/utils/address';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from '../Signing/common/consts';
import { secondsToMinutes } from '../Signing/common/utils';
import ParitySignerSignatureReader from '../Signing/ParitySignerSignatureReader/ParitySignerSignatureReader';
import { ValidationErrors } from './common/constants';
import { useAccount } from '@renderer/services/account/accountService';
import { Message, SelectedAddress, TransferDetails, TransferForm } from './components';
import { AccountDS } from '@renderer/services/storage';
import { Option, ResultOption } from '@renderer/components/ui/Dropdowns/common/types';

const enum Steps {
  CREATING,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  EXECUTING,
}

const DEFAULT_QR_LIFETIME = 64;

const TransferType: Record<AssetType, TransactionType> = {
  [AssetType.ORML]: TransactionType.ORML_TRANSFER,
  [AssetType.STATEMINE]: TransactionType.ASSET_TRANSFER,
};

const Transfer = () => {
  const { t } = useI18n();
  const { chainId, assetId } = useParams<Record<'chainId' | 'assetId', string>>();

  const navigate = useNavigate();
  const { getBalance } = useBalance();
  const { createPayload, getSignedExtrinsic, submitAndWatchExtrinsic, getTransactionFee } = useTransaction();
  const { connections } = useNetworkContext();
  const { getActiveAccounts } = useAccount();
  const { getExpectedBlockTime } = useChains();

  const [currentStep, setCurrentStep] = useState(Steps.CREATING);
  const [txPayload, setTxPayload] = useState<Uint8Array>();
  const [unsigned, setUnsigned] = useState<UnsignedTransaction>();
  const [transaction, setTransaction] = useState<Transaction>();
  const [countdown, setCountdown] = useState<number>(DEFAULT_QR_LIFETIME);
  const [isSuccessMessageOpen, setIsSuccessMessageOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState<ValidationErrors>();
  const [_, setBalance] = useState('');

  const activeAccounts = getActiveAccounts().filter((account) => !account.rootId || account.chainId === chainId);
  const [currentAccount, setCurrentAccount] = useState<AccountDS>();

  useEffect(() => {
    if (activeAccounts.length > 0 && !currentAccount) {
      setCurrentAccount(activeAccounts[0]);
    }
  }, [activeAccounts.length]);

  const [activeAccountsOptions, setActiveAccountsOptions] = useState<Option<number>[]>([]);

  const currentConnection = chainId ? connections[chainId as ChainId] : undefined;
  const currentAsset =
    assetId && currentConnection
      ? (currentConnection.assets.find((a) => a.assetId === Number(assetId)) as Asset)
      : undefined;
  const currentAddress = formatAddress(currentAccount?.accountId || '', currentConnection?.addressPrefix);

  const expectedBlockTime = currentConnection?.api ? getExpectedBlockTime(currentConnection?.api) : undefined;

  const addTransaction = ({ address, amount }: Record<'address' | 'amount', string>) => {
    if (!currentConnection || !currentAddress || !currentAsset || !amount) return;

    const type = currentAsset.type ? TransferType[currentAsset.type] : TransactionType.TRANSFER;

    setTransaction({
      address: currentAddress,
      type,
      chainId: currentConnection.chainId,
      args: {
        dest: formatAddress(address, currentConnection.addressPrefix),
        value: formatAmount(amount, currentAsset.precision),
        asset:
          (currentAsset.typeExtras as StatemineExtras)?.assetId ||
          (currentAsset.typeExtras as OrmlExtras)?.currencyIdScale,
      },
    });

    setCurrentStep(Steps.CONFIRMATION);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [countdown]);

  const setupTransaction = async () => {
    setTxPayload(undefined);
    if (!currentConnection?.api || !transaction || !currentAddress) return;

    const { payload, unsigned } = await createPayload(transaction, currentConnection.api);

    setTxPayload(payload);
    setUnsigned(unsigned);
  };

  useEffect(() => {
    setCountdown(expectedBlockTime?.mul(new BN(DEFAULT_QR_LIFETIME)).div(BN_THOUSAND).toNumber() || 0);
  }, [txPayload]);

  const sign = () => {
    setupTransaction();
    setCurrentStep(Steps.SCANNING);
  };

  useEffect(() => {
    if (!currentConnection || !currentAsset) return;

    (async () => {
      const balance = await getBalance(
        toPublicKey(currentAddress) || '0x',
        currentConnection.chainId,
        currentAsset.assetId.toString(),
      );

      setBalance(balance ? transferable(balance) : '0');
    })();
  }, [currentAddress, currentConnection?.chainId, currentAsset?.assetId]);

  const validateTransaction = async (): Promise<boolean> => {
    const amount = transaction?.args.value;
    const address = transaction?.args.dest;

    if (!currentConnection?.api || !amount || !validateAddress(address) || !currentAsset) return false;

    const publicKey = toPublicKey(currentAddress) || '0x';
    const currentBalance = await getBalance(publicKey, currentConnection.chainId, currentAsset.assetId.toString());

    let nativeTokenBalance;

    if (currentAsset.assetId !== 0) {
      nativeTokenBalance = await getBalance(publicKey, currentConnection.chainId, '0');
    }

    const transferableBalance = currentBalance ? transferable(currentBalance) : '0';
    const transferableNativeTokenBalance = nativeTokenBalance ? transferable(nativeTokenBalance) : null;

    const fee = await getTransactionFee(transaction, currentConnection.api);

    if (new BN(amount).gt(new BN(transferableBalance))) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE);

      return false;
    }

    const notEnoughForFee = transferableNativeTokenBalance
      ? new BN(fee).gt(new BN(transferableNativeTokenBalance))
      : new BN(fee).add(new BN(amount)).gt(new BN(transferableBalance));

    if (notEnoughForFee) {
      setValidationError(ValidationErrors.INSUFFICIENT_BALANCE_FOR_FEE);
    }

    return !notEnoughForFee;
  };

  const sendSignedTransaction = async (signature: HexString) => {
    if (!currentConnection?.api || !unsigned || !signature || !(await validateTransaction())) return;

    const extrinsic = await getSignedExtrinsic(unsigned, signature, currentConnection.api);
    setCurrentStep(Steps.EXECUTING);

    submitAndWatchExtrinsic(extrinsic, unsigned, currentConnection.api, (executed, params) => {
      if (executed) {
        setIsSuccessMessageOpen(true);

        return;
      }

      setErrorMessage(params);
    });
  };

  const handleBackButton = () => {
    if (currentStep === Steps.CREATING) {
      navigate(-1);
    } else {
      setCurrentStep(Steps.CREATING);
    }
  };

  useEffect(() => {
    const accounts = activeAccounts.reduce<Option[]>((acc, account, index) => {
      if (account.chainId !== undefined && account.chainId !== currentConnection?.chainId) return acc;
      const address = toAddress(account.publicKey || '0x00', currentConnection?.addressPrefix);

      const accountType =
        account.signingType === SigningType.PARITY_SIGNER ? 'paritySignerBackground' : 'watchOnlyBackground';

      const accountOption = {
        id: address,
        value: index,
        element: (
          <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
            <Icon className="row-span-2 self-center" name={accountType} size={34} />
            <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
            <Address type="short" address={address} canCopy={false} />
          </div>
        ),
      };

      return acc.concat(accountOption);
    }, []);

    if (accounts.length === 0) return;

    setActiveAccountsOptions(accounts);
  }, [activeAccounts.length, currentConnection?.chainId]);

  const setActiveAccount = (account: ResultOption<number>) => {
    setCurrentAccount(activeAccounts[account.value]);
  };

  // TS doesn't work with Boolean type
  const readyToCreate = !!(currentAccount && currentAsset && currentAddress && currentConnection);
  const readyToConfirm = !!(readyToCreate && transaction);

  const editOperation = () => {
    setValidationError(undefined);
    setCurrentStep(Steps.CREATING);
  };

  return (
    <div className="h-full pb-5 overflow-auto">
      <div className="flex items-center gap-x-2.5 mb-9">
        <ButtonBack onCustomReturn={handleBackButton} />
        <p className="font-semibold text-2xl text-neutral-variant">{t('balances.title')}</p>
        <p className="font-semibold text-2xl text-neutral">/</p>
        <h1 className="font-semibold text-2xl text-neutral">{t('transfer.title')}</h1>
      </div>

      <div>
        {currentStep === Steps.CREATING && readyToCreate && (
          <div className="w-[500px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
            {activeAccountsOptions.length > 1 ? (
              <div className="w-full mb-2.5 p-5 bg-white">
                <Dropdown
                  weight="lg"
                  placeholder={t('receive.selectWalletPlaceholder')}
                  activeId={currentAccount?.accountId}
                  options={activeAccountsOptions}
                  onChange={setActiveAccount}
                />
              </div>
            ) : (
              <SelectedAddress account={currentAccount} connection={currentConnection} />
            )}
            <TransferForm
              account={currentAccount}
              asset={currentAsset}
              connection={currentConnection}
              onCreateTransaction={addTransaction}
            />
          </div>
        )}
        {currentStep === Steps.CONFIRMATION && readyToConfirm && (
          <>
            <TransferDetails
              account={currentAccount}
              transaction={transaction}
              asset={currentAsset}
              connection={currentConnection}
            />
            <Button variant="outline" weight="lg" pallet="primary" className="w-fit flex-0 m-auto mt-5" onClick={sign}>
              {t('transfer.startSigningButton')}
            </Button>
          </>
        )}
        {[Steps.SCANNING, Steps.SIGNING].includes(currentStep) && currentConnection && (
          <div className="w-[500px] rounded-2xl bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5 overflow-auto">
            {currentAccount && currentConnection && (
              <SelectedAddress account={currentAccount} connection={currentConnection} />
            )}

            {currentStep === Steps.SCANNING && (
              <div className="flex flex-col gap-2.5 w-full">
                <div className="bg-white p-5 shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
                  <div className="text-neutral-variant text-base font-semibold">{t('signing.scanQrTitle')}</div>
                  {txPayload && currentAddress ? (
                    <div className="w-[220px] h-[220px]">
                      <QrTxGenerator
                        cmd={0}
                        payload={txPayload}
                        address={currentAddress}
                        genesisHash={currentConnection.chainId}
                      />
                    </div>
                  ) : (
                    <div className="w-[220px] h-[220px] rounded-2lg bg-shade-20 animate-pulse" />
                  )}
                  {txPayload && currentAddress && (
                    <div className="flex items-center uppercase font-normal text-xs gap-1.25">
                      {t('signing.qrCountdownTitle')}
                      <div
                        className={cn(
                          'rounded-md text-white py-0.5 px-1.5',
                          countdown > 60 ? 'bg-success' : countdown > 0 ? 'bg-alert' : 'bg-error',
                        )}
                      >
                        {secondsToMinutes(countdown)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center text-xs font-semibold text-primary">
                  <a className="flex items-center" href={TROUBLESHOOTING_URL} rel="noopener noreferrer" target="_blank">
                    <Icon as="img" name="globe" /> {t('signing.troubleshootingLink')}
                  </a>
                  <a
                    className="flex items-center"
                    href={getMetadataPortalUrl(currentConnection.chainId)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon as="img" name="globe" /> {t('signing.metadataPortalLink')}
                  </a>
                </div>
                {txPayload && countdown > 0 ? (
                  <Button
                    className="w-fit m-auto"
                    variant="fill"
                    pallet="primary"
                    weight="lg"
                    onClick={() => setCurrentStep(Steps.SIGNING)}
                  >
                    {t('signing.continueButton')}
                  </Button>
                ) : (
                  <Button variant="fill" pallet="primary" weight="lg" onClick={() => setupTransaction()}>
                    {t('signing.generateNewQrButton')}
                  </Button>
                )}
              </div>
            )}

            {currentStep === Steps.SIGNING && (
              <>
                <div className="bg-white shadow-surface rounded-2xl flex flex-col items-center gap-5 w-full">
                  <div className="my-4 text-neutral-variant text-base font-semibold">
                    {t('signing.scanSignatureTitle')}
                  </div>

                  <div className="h-[460px]">
                    <ParitySignerSignatureReader
                      className="w-full rounded-2lg"
                      countdown={countdown}
                      size={460}
                      validationError={validationError}
                      onResult={(signature) => {
                        sendSignedTransaction(signature as HexString);
                      }}
                    />
                  </div>
                </div>
                {countdown === 0 && (
                  <Button
                    variant="fill"
                    pallet="primary"
                    weight="lg"
                    onClick={() => {
                      setCurrentStep(Steps.SCANNING);
                      setupTransaction();
                    }}
                  >
                    {t('signing.generateNewQrButton')}
                  </Button>
                )}

                {validationError && (
                  <Button className="w-max mb-5" weight="lg" variant="fill" pallet="primary" onClick={editOperation}>
                    {t('transfer.editOperationButton')}
                  </Button>
                )}
              </>
            )}
          </div>
        )}
        {currentStep === Steps.EXECUTING && readyToConfirm && (
          <>
            <TransferDetails
              account={currentAccount}
              connection={currentConnection}
              transaction={transaction}
              asset={currentAsset}
            />

            {(!isSuccessMessageOpen || Boolean(errorMessage)) && (
              <div className="mt-8 text-neutral-variant font-semibold flex items-center gap-3 w-fit m-auto">
                <Icon className="animate-spin" name="loader" size={15} />
                {t('transfer.executing')}
              </div>
            )}
          </>
        )}
      </div>

      <Message
        isOpen={isSuccessMessageOpen}
        onClose={() => {
          setIsSuccessMessageOpen(false);
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
    </div>
  );
};

export default Transfer;
