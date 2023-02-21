import { BN, BN_THOUSAND } from '@polkadot/util';
import { UnsignedTransaction } from '@substrate/txwrapper-polkadot';
import cn from 'classnames';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { QrTxGenerator } from '@renderer/components/common';
import { Address, Block, Button, ButtonBack, Dropdown, Icon, InfoLink, Plate } from '@renderer/components/ui';
import { DropdownOption, DropdownResult } from '@renderer/components/ui/Dropdowns/common/types';
import { useI18n } from '@renderer/context/I18nContext';
import { useNetworkContext } from '@renderer/context/NetworkContext';
import { Asset, AssetType, OrmlExtras, StatemineExtras } from '@renderer/domain/asset';
import { ChainId, HexString, SigningType } from '@renderer/domain/shared-kernel';
import { Transaction, TransactionType } from '@renderer/domain/transaction';
import { useAccount } from '@renderer/services/account/accountService';
import { useBalance } from '@renderer/services/balance/balanceService';
import { formatAmount, toAddress, transferableAmount } from '@renderer/services/balance/common/utils';
import { useChains } from '@renderer/services/network/chainsService';
import { useTransaction } from '@renderer/services/transaction/transactionService';
import { formatAddress, toPublicKey, validateAddress } from '@renderer/shared/utils/address';
import { DEFAULT_QR_LIFETIME } from '@renderer/shared/utils/constants';
import { secondsToMinutes } from '@renderer/shared/utils/time';
import { getMetadataPortalUrl, TROUBLESHOOTING_URL } from '../Signing/common/consts';
import ParitySignerSignatureReader from '../Signing/ParitySignerSignatureReader/ParitySignerSignatureReader';
import { ValidationErrors } from './common/constants';
import { Message, SelectedAddress, TransferDetails, TransferForm } from './components';

const enum Steps {
  CREATING,
  CONFIRMATION,
  SCANNING,
  SIGNING,
  EXECUTING,
}

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
  const [countdown, setCountdown] = useState(DEFAULT_QR_LIFETIME);
  const [isSuccessMessageOpen, setIsSuccessMessageOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState<ValidationErrors>();
  const [_, setBalance] = useState('');

  const activeAccounts = getActiveAccounts().filter((account) => !account.rootId || account.chainId === chainId);

  const [activeAccountsOptions, setActiveAccountsOptions] = useState<DropdownOption<number>[]>([]);
  const [activeAccount, setActiveAccount] = useState<DropdownResult<number>>();

  const currentConnection = chainId ? connections[chainId as ChainId] : undefined;
  const currentAsset =
    assetId && currentConnection
      ? (currentConnection.assets.find((a) => a.assetId === Number(assetId)) as Asset)
      : undefined;

  useEffect(() => {
    const accounts = activeAccounts.reduce<DropdownOption[]>((acc, account, index) => {
      if (
        (account.chainId !== undefined && account.chainId !== currentConnection?.chainId) ||
        account.signingType === SigningType.WATCH_ONLY
      ) {
        return acc;
      }

      const address = toAddress(account.publicKey || '0x00', currentConnection?.addressPrefix);
      if (acc.some((a) => a.id === address)) {
        return acc;
      }

      const accountType =
        account.signingType === SigningType.PARITY_SIGNER ? 'paritySignerBackground' : 'watchOnlyBackground';

      acc.push({
        id: address,
        value: index,
        element: (
          <div className="grid grid-rows-2 grid-flow-col gap-x-2.5">
            <Icon className="row-span-2 self-center" name={accountType} size={34} />
            <p className="text-left text-neutral text-lg font-semibold leading-5">{account.name}</p>
            <Address type="short" address={address} canCopy={false} />
          </div>
        ),
      });

      return acc;
    }, []);

    if (accounts.length === 0) return;

    setActiveAccountsOptions(accounts);
    setActiveAccount({ id: accounts[0].id, value: accounts[0].value });
  }, [activeAccounts.length, currentConnection?.chainId]);

  const currentAccount = activeAccount ? activeAccounts[activeAccount.value] : undefined;

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

      setBalance(balance ? transferableAmount(balance) : '0');
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

    const transferableBalance = currentBalance ? transferableAmount(currentBalance) : '0';
    const transferableNativeTokenBalance = nativeTokenBalance ? transferableAmount(nativeTokenBalance) : null;

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

  // TS doesn't work with Boolean type
  const readyToCreate = !!(currentAccount && currentAsset && currentAddress && currentConnection);
  const readyToConfirm = !!(readyToCreate && transaction);

  const editOperation = () => {
    setValidationError(undefined);
    setCurrentStep(Steps.CREATING);
  };

  return (
    <div className="h-full flex flex-col gap-y-9">
      <div className="flex items-center gap-x-2.5 mt-5 px-5">
        <ButtonBack onCustomReturn={handleBackButton}>
          <p className="font-semibold text-2xl text-neutral-variant">{t('balances.title')}</p>
          <p className="font-semibold text-2xl text-neutral">/</p>
          <h1 className="font-semibold text-2xl text-neutral">{t('transfer.title')}</h1>
        </ButtonBack>
      </div>

      <div className="overflow-y-auto">
        {currentStep === Steps.CREATING && readyToCreate && (
          <div className="w-[500px] rounded-2lg bg-shade-2 p-5 flex flex-col items-center m-auto gap-2.5">
            {activeAccountsOptions.length > 1 ? (
              <div className="w-full mb-2.5 p-5 bg-white rounded-2lg shadow-surface">
                <Dropdown
                  weight="lg"
                  placeholder={t('receive.selectWalletPlaceholder')}
                  activeId={activeAccount?.id}
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
          <Plate as="section" className="w-[500px] flex flex-col items-center m-auto gap-2.5 overflow-auto">
            {currentAccount && currentConnection && (
              <SelectedAddress account={currentAccount} connection={currentConnection} />
            )}

            {currentStep === Steps.SCANNING && (
              <div className="flex flex-col w-full">
                <Block className="flex flex-col items-center gap-y-2.5">
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
                </Block>
                <div className="flex flex-col items-center gap-y-1 text-xs font-semibold text-primary mt-2.5 mb-5">
                  <InfoLink url={TROUBLESHOOTING_URL}>{t('signing.troubleshootingLink')}</InfoLink>
                  <InfoLink url={getMetadataPortalUrl(currentConnection.chainId)}>
                    {t('signing.metadataPortalLink')}
                  </InfoLink>
                </div>
                {txPayload && countdown > 0 ? (
                  <Button
                    className="w-max mx-auto"
                    variant="fill"
                    pallet="primary"
                    weight="lg"
                    onClick={() => setCurrentStep(Steps.SIGNING)}
                  >
                    {t('signing.continueButton')}
                  </Button>
                ) : (
                  <Button variant="fill" pallet="primary" weight="lg" onClick={setupTransaction}>
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
                      onResult={(signature) => sendSignedTransaction(signature as HexString)}
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
          </Plate>
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
