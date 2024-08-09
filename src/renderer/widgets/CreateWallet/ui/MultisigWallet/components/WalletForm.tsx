import { useUnit } from 'effector-react';
import { useEffect } from 'react';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';

import { useI18n } from '@app/providers';
import {
  type AccountId,
  type Chain,
  type ChainId,
  CryptoType,
  type MultisigAccount,
  type Signatory,
} from '@shared/core';
import { Alert, Button, Input, InputHint, Select, SmallTitleText } from '@shared/ui';
import { type DropdownOption, type DropdownResult } from '@shared/ui/types';
import { ChainTitle } from '@entities/chain';
import { matrixModel } from '@entities/matrix';
import { networkModel, networkUtils } from '@entities/network';
import { accountUtils, walletModel, walletUtils } from '@entities/wallet';

type MultisigAccountForm = {
  name: string;
  threshold: DropdownResult<number> | undefined;
  chain?: ChainId;
};

const getThresholdOptions = (optionsAmount: number): DropdownOption<number>[] => {
  if (optionsAmount === 0) {
    return [];
  }

  return Array.from({ length: optionsAmount }, (_, index) => ({
    id: index.toString(),
    element: index + 2,
    value: index + 2,
  }));
};

const getChainOptions = (chains: Chain[]): DropdownOption<ChainId>[] => {
  return chains
    .filter((c) => networkUtils.isMultisigSupported(c.options))
    .map((chain) => ({
      id: chain.chainId.toString(),
      element: <ChainTitle chain={chain} />,
      value: chain.chainId,
    }));
};

type Props = {
  signatories: Signatory[];
  isActive: boolean;
  isLoading: boolean;
  withChain?: boolean;
  onContinue: () => void;
  onGoBack: () => void;
  onChainChange?: (chainId: ChainId) => void;
  onSubmit: ({ name, threshold, creatorId }: { name: string; threshold: number; creatorId: AccountId }) => void;
};

export const WalletForm = ({
  signatories,
  onContinue,
  withChain = false,
  isActive,
  isLoading,
  onChainChange,
  onGoBack,
  onSubmit,
}: Props) => {
  const { t } = useI18n();

  const matrix = useUnit(matrixModel.$matrix);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);

  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
  } = useForm<MultisigAccountForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      threshold: undefined,
      chain: withChain ? (Object.keys(chains)[0] as ChainId) : undefined,
    },
  });

  const threshold = watch('threshold');
  const chain = watch('chain');

  useEffect(() => {
    if (withChain && chain) {
      onChainChange?.(chain);
    }
  }, [chain]);

  const thresholdOptions = getThresholdOptions(signatories.length - 1);
  const chainOptions = getChainOptions(Object.values(chains));
  const cryptoType =
    withChain && chain && networkUtils.isEthereumBased(chains[chain].options)
      ? CryptoType.ETHEREUM
      : CryptoType.SR25519;

  const multisigAccountId =
    threshold &&
    accountUtils.getMultisigAccountId(
      signatories.map((s) => s.accountId),
      threshold.value,
      cryptoType,
    );

  const submitMstAccount: SubmitHandler<MultisigAccountForm> = ({ name, threshold }) => {
    const creator = signatories.find((s) => s.matrixId === matrix.userId);

    if (!threshold || !creator) return;

    onSubmit({ name, threshold: threshold.value, creatorId: creator.accountId });
  };

  const noSignatoryWallet = wallets.every(
    (wallet) => walletUtils.isWatchOnly(wallet) || walletUtils.isMultisig(wallet),
  );

  const signatoriesWallets = walletUtils.getWalletsFilteredAccounts(wallets, {
    walletFn: (w) => !walletUtils.isWatchOnly(w) && !walletUtils.isMultisig(w),
    accountFn: (a) => signatories.some((s) => s.accountId === a.accountId),
  });

  const existingWallet = walletUtils.getWalletFilteredAccounts(wallets, {
    walletFn: (w) => walletUtils.isMultisig(w),
    accountFn: (a) => {
      const multisigAccount = a as MultisigAccount;
      const isSameAccountId = a.accountId === multisigAccountId;
      const isSameChainId = !multisigAccount.chainId || multisigAccount.chainId === chain;

      return isSameAccountId && isSameChainId;
    },
  });

  const hasTwoSignatories = signatories.length > 1;

  const signatoriesAreValid = signatoriesWallets && hasTwoSignatories && !existingWallet;

  const canContinue = isValid && signatoriesAreValid;

  return (
    <section className="flex h-full flex-1 flex-col gap-y-4 px-3 py-4">
      <SmallTitleText className="px-2 py-2">{t('createMultisigAccount.walletFormTitle')}</SmallTitleText>

      <form id="multisigForm" className="flex h-full flex-col gap-y-4 px-2" onSubmit={handleSubmit(submitMstAccount)}>
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field: { value, onChange }, fieldState: { error } }) => (
            <Input
              placeholder={t('createMultisigAccount.namePlaceholder')}
              label={t('createMultisigAccount.walletNameLabel')}
              invalid={!!error}
              value={value}
              disabled={!isActive}
              onChange={onChange}
            />
          )}
        />
        {withChain && (
          <div className="flex items-end gap-x-4">
            <Controller
              name="chain"
              control={control}
              rules={{ required: true }}
              render={({ field: { value, onChange } }) => (
                <Select
                  placeholder={t('createMultisigAccount.chainPlaceholder')}
                  label={t('createMultisigAccount.chainName')}
                  className="w-[204px]"
                  selectedId={value}
                  options={chainOptions}
                  disabled={!isActive}
                  onChange={({ id }) => onChange(id)}
                />
              )}
            />
            <InputHint className="flex-1" active>
              {t('createMultisigAccount.chainHint')}
            </InputHint>
          </div>
        )}
        <div className="flex items-end gap-x-4">
          <Controller
            name="threshold"
            control={control}
            rules={{ required: true }}
            render={({ field: { value, onChange } }) => (
              <Select
                placeholder={t('createMultisigAccount.thresholdPlaceholder')}
                label={t('createMultisigAccount.thresholdName')}
                className="w-[204px]"
                selectedId={value?.id.toString()}
                disabled={signatories.length < 2 || !isActive}
                options={thresholdOptions}
                onChange={onChange}
              />
            )}
          />
          <InputHint className="flex-1" active>
            {t('createMultisigAccount.thresholdHint')}
          </InputHint>
        </div>

        <Alert
          active={Boolean(signatories.length) && !signatoriesWallets}
          title={t('createMultisigAccount.walletAlertTitle')}
          variant="warn"
        >
          <Alert.Item withDot={false}>{t('createMultisigAccount.walletAlertText')}</Alert.Item>
        </Alert>

        <Alert active={Boolean(existingWallet)} title={t('createMultisigAccount.multisigExistTitle')} variant="warn">
          <Alert.Item withDot={false}>{t('createMultisigAccount.multisigExistText')}</Alert.Item>
        </Alert>

        <Alert active={noSignatoryWallet} title={t('createMultisigAccount.walletAlertTitle')} variant="warn">
          <Alert.Item withDot={false}>{t('createMultisigAccount.accountsAlertText')}</Alert.Item>
        </Alert>

        <div className="mt-auto flex items-center justify-between">
          <Button variant="text" onClick={onGoBack}>
            {t('createMultisigAccount.backButton')}
          </Button>
          {isActive ? (
            // without key continue button triggers form submit
            <Button key="continue" disabled={!canContinue} onClick={onContinue}>
              {t('createMultisigAccount.continueButton')}
            </Button>
          ) : (
            <Button key="create" disabled={!canContinue || isLoading} type="submit">
              {t('createMultisigAccount.create')}
            </Button>
          )}
        </div>
      </form>
    </section>
  );
};
