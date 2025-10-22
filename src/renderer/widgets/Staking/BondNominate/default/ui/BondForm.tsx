import { useUnit } from 'effector-react';
import { type FormEvent, useMemo, useState } from 'react';

import { RewardsDestination } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import {
  formatAsset,
  fromPrecision,
  getNativeAsset,
  toAddress,
  toShortAddress,
  transferableAmount,
} from '@/shared/lib/utils';
import { Button, Combobox, DetailRow, FootnoteText, Icon, InputHint, RadioGroup } from '@/shared/ui';
import { type RadioOption } from '@/shared/ui/types';
import { AssetBalance, Identicon, SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel } from '@/entities/transaction';
import { AccountAddress, accountUtils, walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const BondForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />
      <form id="transfer-form" className="mt-4 flex flex-col gap-y-4" onSubmit={submitForm}>
        <Signatories />
        <Amount />
        <Destination />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const balances = useUnit(balanceModel.$balanceMap);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);

  const signatoriesWithBalance = useMemo(() => {
    if (!network) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(
        balances,
        signatory.accountId,
        network.chain.chainId,
        network.asset.assetId,
      );
      return { account: signatory, balance: transferableAmount(balance) };
    });
  }, [signatories, balances]);

  if (!network) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={signatory.value}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={network}
      onChange={signatory.onChange}
    />
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const bondBalanceRange = useUnit(formModel.$bondBalanceRange);
  const reusableLock = useUnit(formModel.$reusableLock);

  if (!network) {
    return null;
  }

  const showReuseLockBtn = !!reusableLock?.gtn(0);

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError}
        value={amount.value}
        balance={bondBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>

      {reusableLock && showReuseLockBtn && (
        <div className="flex justify-end">
          <Button
            size="sm"
            pallet="secondary"
            onClick={() => amount.onChange(fromPrecision(reusableLock, network.asset.precision))}
          >
            {t('governance.vote.reuseLock')}: {formatAsset(reusableLock, network.asset)}
          </Button>
        </div>
      )}
    </div>
  );
};

const Destination = () => {
  const { t } = useI18n();

  const {
    fields: { destination },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const destinationAccounts = useUnit(formModel.$destinationAccounts);
  const destinationQuery = useUnit(formModel.$destinationQuery);

  const [payout, setPayout] = useState('');
  const [activeOptionId, setActiveOptionId] = useState<string>('0');

  if (!network) {
    return null;
  }

  const options: RadioOption<{ type: RewardsDestination; value: string }>[] = [
    { title: t('staking.bond.restakeRewards'), value: '', rewardType: RewardsDestination.RESTAKE },
    { title: t('staking.bond.transferableRewards'), value: payout, rewardType: RewardsDestination.TRANSFERABLE },
  ].map((dest, index) => ({
    id: index.toString(),
    value: { type: dest.rewardType, value: dest.value },
    title: dest.title,
  }));

  const destinationOptions = destinationAccounts.map((account) => {
    const isShard = accountUtils.isVaultShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: address,
      element: (
        <div className="flex w-full justify-between" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 20) : account.name}
            canCopy={false}
          />
        </div>
      ),
    };
  });

  const prefixElement = (
    <div className="flex h-auto items-center">
      <Identicon
        address={toAddress(payout, { prefix: network.chain.addressPrefix })}
        size={20}
        background={false}
        canCopy={false}
      />
    </div>
  );

  return (
    <RadioGroup
      label={t('staking.bond.rewardsDestinationLabel')}
      className="col-span-2"
      activeId={activeOptionId}
      options={options}
      onChange={(option) => {
        setActiveOptionId(option.id);
        destination.onChange(option.value.value);
        formModel.destinationTypeChanged(option.value.type);
      }}
    >
      <RadioGroup.Option option={options[0]} />
      <RadioGroup.Option option={options[1]}>
        <div className="flex flex-col gap-y-2">
          <Combobox
            placeholder={t('staking.bond.payoutAccountPlaceholder')}
            query={destinationQuery}
            value={payout}
            options={destinationOptions}
            invalid={destination.hasError}
            prefixElement={prefixElement}
            onInput={formModel.destinationQueryChanged}
            onChange={({ value }) => {
              setPayout(value);
              destination.onChange(value);
            }}
          />

          <InputHint active={destination.hasError} variant="error">
            {t('staking.bond.incorrectAddressError')}
          </InputHint>
        </div>
      </RadioGroup.Option>
    </RadioGroup>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { initiator },
  } = useForm(formModel.form);

  const network = useUnit(formModel.$networkStore);
  const fee = useUnit(formModel.$fee);
  const isFeeLoading = useUnit(formModel.$pendingFee);
  const isMultisig = useUnit(formModel.$isMultisig);
  const multisigDeposit = useUnit(formModel.$multisigDeposit);

  if (!network || !initiator.value) {
    return null;
  }

  const nativeAsset = getNativeAsset(network.chain.assets);

  return (
    <div className="flex flex-col gap-y-2">
      {isMultisig && (
        <DetailRow
          className="text-text-primary"
          label={
            <>
              <Icon className="text-text-tertiary" name="lock" size={12} />
              <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
              <Tooltip>
                <Tooltip.Trigger>
                  <div tabIndex={0}>
                    <Icon name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('staking.tooltips.depositDescription')}</Tooltip.Content>
              </Tooltip>
            </>
          }
        >
          <div className="flex flex-col items-end gap-y-0.5">
            <AssetBalance value={multisigDeposit ?? undefined} asset={nativeAsset} />
            <AssetFiatBalance asset={nativeAsset} amount={multisigDeposit ?? undefined} />
          </div>
        </DetailRow>
      )}

      <FeeWithLabel
        label={t('staking.networkFee', { count: 1 })}
        asset={nativeAsset}
        fee={fee.toString()}
        isLoading={isFeeLoading}
      />
    </div>
  );
};

const ActionsSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
