import { useUnit } from 'effector-react';
import { type FormEvent, useState } from 'react';

import { RewardsDestination } from '@/shared/core';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { formatAsset, getNativeAsset, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Button, Combobox, DetailRow, FootnoteText, Icon, InputHint, RadioGroup } from '@/shared/ui';
import { type RadioOption } from '@/shared/ui/types';
import { AssetBalance, Identicon, TransactionValidationError } from '@/shared/ui-entities';
import { Tooltip } from '@/shared/ui-kit';
import { useAccountsNames } from '@/domains/network';
import { AccountAddress, accountUtils, walletModel } from '@/entities/wallet';
import { AmountInput } from '@/features/assets-balances';
import { DraftFormBody, DraftModeCard, DraftSigningPath } from '@/features/drafts';
import { SigningPathSection } from '@/features/signing-path';
import { AssetFiatBalance } from '@/widgets/price';
import { FeeWithLabel } from '@/widgets/transaction-fee';
import { formModel } from '../model/form-model';

type Props = {
  onGoBack: () => void;
};

export const BondForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.form);
  const errors = useUnit(formModel.$errors);
  const wallets = useUnit(walletModel.$wallets);
  const isDraftMode = useUnit(formModel.$isDraftMode);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <DraftModeCard isOn={isDraftMode} onToggle={formModel.events.toggleDraftMode} />
      {isDraftMode && network && (
        <DraftSigningPath
          chainId={network.chain.chainId}
          asset={network.asset}
          pinnedSourceAccountId={null}
          $draftPath={formModel.$draftSigningPath}
          draftPathCommitted={formModel.events.draftPathCommitted}
          draftPathEditStarted={formModel.events.draftPathEditStarted}
          draftPathEditEnded={formModel.events.draftPathEditEnded}
        />
      )}
      <DraftFormBody $isDraftMode={formModel.$isDraftMode} $isDraftPathComplete={formModel.$isDraftPathComplete}>
        <div className="flex flex-col gap-4">
          {/* In draft mode the eventual signer pays the fee and is responsible
              for signer-validity, so we hide tx-level validation and the fee
              section — the form stays focused on call-data inputs. */}
          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
          <form id="transfer-form" className="flex flex-col gap-y-4" onSubmit={submitForm}>
            <Signatories />
            <Amount />
            <Destination />
          </form>
          {!isDraftMode && (
            <div className="flex flex-col gap-y-6 pt-2 pb-4">
              <FeeSection />
            </div>
          )}
        </div>
      </DraftFormBody>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const isDraftMode = useUnit(formModel.$isDraftMode);
  const signingPath = useUnit(formModel.$signingPath);
  const network = useUnit(formModel.$networkStore);
  const formErrors = useUnit(formModel.$errors);

  if (isDraftMode) return null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={network?.chain ?? null}
      asset={network?.asset ?? null}
      txErrors={formErrors}
      errorText={t(signatory.errorMessage)}
      onChange={formModel.signingPathChanged}
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
  const setReuseLockMode = useUnit(formModel.setReuseLockMode);

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
        onKeyDown={() => setReuseLockMode(false)}
      />
      <InputHint active={amount.hasError} variant="error">
        {t(amount.errorMessage)}
      </InputHint>

      {reusableLock && showReuseLockBtn && (
        <div className="flex justify-end">
          <Button size="sm" pallet="secondary" onClick={() => setReuseLockMode(true)}>
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
  const resolvedDestinationAccounts = useAccountsNames(destinationAccounts, network?.chain);

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

  const destinationOptions = resolvedDestinationAccounts.map((account) => {
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
      <RadioGroup.Option option={options[0]!} />
      <RadioGroup.Option option={options[1]!}>
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
        fee={fee}
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
