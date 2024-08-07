import { BN } from '@polkadot/util';
import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useI18n } from '@app/providers';
import { formatAmount, formatBalance } from '@shared/lib/utils';
import {
  AmountInput,
  BaseModal,
  Button,
  DetailRow,
  FootnoteText,
  Icon,
  Input,
  InputHint,
  Slider,
  SmallTitleText,
  TitleText,
  Tooltip,
} from '@shared/ui';
import { OperationTitle } from '@/entities/chain';
import { ValueIndicator, votingService } from '@/entities/governance';
import { AssetBalance } from '@entities/asset';
import { SignatorySelector } from '@entities/operations';
import { priceProviderModel } from '@entities/price';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { FeeLoader } from '@entities/transaction';
import { ProxyWalletAlert } from '@entities/wallet';
import { locksModel } from '@/features/governance/model/locks';
import { formModel } from '../model/form-model';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGoBack: () => void;
};

export const DelegateForm = ({ isOpen, onClose, onGoBack }: Props) => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.$delegateForm);
  const network = useUnit(formModel.$networkStore);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <BaseModal
      closeButton
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal h-[738px] gap-4 bg-white"
      contentClass="min-h-0 h-full w-full bg-card-background py-4"
      isOpen={isOpen}
      title={
        network?.chain && <OperationTitle title={t('governance.addDelegation.title')} chainId={network.chain.chainId} />
      }
      onClose={onClose}
    >
      <div className="pb-4 px-5 w-modal">
        <SmallTitleText>{t('governance.addDelegation.formTitle')}</SmallTitleText>

        <form id="transfer-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitForm}>
          <ProxyFeeAlert />
          <Signatories />
          <Amount />
          <Conviction />
          <Description />
        </form>
        <div className="flex flex-col gap-y-6 pt-6 pb-4">
          <FeeSection />
        </div>
        <ActionsSection onGoBack={onGoBack} />
      </div>
    </BaseModal>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModel.$delegateForm);

  const feeData = useUnit(formModel.$feeData);
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !shards.hasError()) {
    return null;
  }

  const formattedFee = formatBalance(feeData.fee, network.asset.precision).value;
  const formattedBalance = formatBalance(balance, network.asset.precision).value;

  return (
    <ProxyWalletAlert
      wallet={proxyWallet}
      fee={formattedFee}
      balance={formattedBalance}
      symbol={network.asset.symbol}
      onClose={shards.resetErrors}
    />
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$delegateForm);

  const signatories = useUnit(formModel.$signatories);
  const network = useUnit(formModel.$networkStore);
  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig || !network) {
    return null;
  }

  return (
    <SignatorySelector
      signatory={signatory.value}
      signatories={signatories[0]}
      asset={network.chain.assets[0]}
      addressPrefix={network.chain.addressPrefix}
      hasError={signatory.hasError()}
      errorText={t(signatory.errorText())}
      onChange={signatory.onChange}
    />
  );
};

const convictionColors = [
  'text-text-conviction-slider-text-01',
  'text-text-conviction-slider-text-1',
  'text-text-conviction-slider-text-2',
  'text-text-conviction-slider-text-3',
  'text-text-conviction-slider-text-4',
  'text-text-conviction-slider-text-5',
  'text-text-conviction-slider-text-6',
];

const renderLabel = (value: number) => (
  <FootnoteText className={convictionColors[value]}>
    {/* eslint-disable-next-line i18next/no-literal-string */}
    {value}x
  </FootnoteText>
);

const Conviction = () => {
  const { t } = useI18n();

  const {
    fields: { conviction, amount },
  } = useForm(formModel.$delegateForm);
  const network = useUnit(formModel.$networkStore);

  if (!network) {
    return null;
  }

  const numericValue = conviction.value;
  const votingPower = votingService.calculateVotingPower(
    new BN(formatAmount(amount.value, network.asset.precision)),
    votingService.getConviction(conviction.value),
  );

  return (
    <div className="flex flex-col gap-3">
      <FootnoteText className="text-text-tertiary">{t('governance.addDelegation.convictionLabel')}</FootnoteText>
      <Slider value={numericValue} min={0} max={6} renderLabel={renderLabel} onChange={conviction.onChange} />
      <div className="flex justify-center">
        <TitleText className="text-text-tertiary">
          {t('governance.referendum.votes', { votes: formatBalance(votingPower, network.asset.precision).formatted })}
        </TitleText>
      </div>
    </div>
  );
};

const Amount = () => {
  const { t } = useI18n();

  const {
    fields: { amount },
  } = useForm(formModel.$delegateForm);

  const network = useUnit(formModel.$networkStore);
  const delegateBalanceRange = useUnit(formModel.$delegateBalanceRange);

  if (!network) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <AmountInput
        invalid={amount.hasError()}
        value={amount.value}
        balance={delegateBalanceRange}
        balancePlaceholder={t('general.input.availableLabel')}
        placeholder={t('general.input.amountLabel')}
        asset={network.asset}
        onChange={amount.onChange}
      />
      <InputHint active={amount.hasError()} variant="error">
        {t(amount.errorText())}
      </InputHint>
    </div>
  );
};

const Description = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(formModel.$delegateForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <Input
        spellCheck
        className="w-full"
        label={t('general.input.descriptionLabel')}
        placeholder={t('general.input.descriptionPlaceholder')}
        invalid={description.hasError()}
        value={description.value}
        onChange={description.onChange}
      />
      <InputHint active={description.hasError()} variant="error">
        {t(description.errorText())}
      </InputHint>
    </div>
  );
};

const FeeSection = () => {
  const { t } = useI18n();

  const {
    fields: { shards, amount },
  } = useForm(formModel.$delegateForm);

  const network = useUnit(formModel.$networkStore);
  const feeData = useUnit(formModel.$feeData);
  const isFeeLoading = useUnit(formModel.$isFeeLoading);
  const isMultisig = useUnit(formModel.$isMultisig);
  const totalLock = useUnit(locksModel.$totalLock);

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!network || shards.value.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      <DetailRow label={t('governance.locks.governanceLock')} wrapperClassName="items-start">
        <ValueIndicator
          from={totalLock.toString()}
          to={new BN(totalLock).add(new BN(formatAmount(amount.value, network.asset.precision))).toString()}
          asset={network.asset}
        />
      </DetailRow>

      {isMultisig && (
        <DetailRow
          className="text-text-primary"
          label={
            <>
              <Icon className="text-text-tertiary" name="lock" size={12} />
              <FootnoteText className="text-text-tertiary">{t('staking.multisigDepositLabel')}</FootnoteText>
              <Tooltip content={t('staking.tooltips.depositDescription')} offsetPx={-90}>
                <Icon name="info" className="hover:text-icon-hover cursor-pointer" size={16} />
              </Tooltip>
            </>
          }
        >
          <div className="flex flex-col gap-y-0.5 items-end">
            <AssetBalance value={feeData.multisigDeposit} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.multisigDeposit} />
          </div>
        </DetailRow>
      )}

      <DetailRow
        label={
          <FootnoteText className="text-text-tertiary">
            {t('staking.networkFee', { count: shards.value.length || 1 })}
          </FootnoteText>
        }
        className="text-text-primary"
      >
        {isFeeLoading ? (
          <FeeLoader fiatFlag={Boolean(fiatFlag)} />
        ) : (
          <div className="flex flex-col gap-y-0.5 items-end">
            <AssetBalance value={feeData.fee} asset={network.chain.assets[0]} />
            <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.fee} />
          </div>
        )}
      </DetailRow>

      {shards.value.length > 1 && (
        <DetailRow
          label={<FootnoteText className="text-text-tertiary">{t('staking.networkFeeTotal')}</FootnoteText>}
          className="text-text-primary"
        >
          {isFeeLoading ? (
            <FeeLoader fiatFlag={Boolean(fiatFlag)} />
          ) : (
            <div className="flex flex-col gap-y-0.5 items-end">
              <AssetBalance value={feeData.totalFee} asset={network.chain.assets[0]} />
              <AssetFiatBalance asset={network.chain.assets[0]} amount={feeData.totalFee} />
            </div>
          )}
        </DetailRow>
      )}
    </div>
  );
};

const ActionsSection = ({ onGoBack }: { onGoBack: () => void }) => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);

  return (
    <div className="flex justify-between items-center mt-4">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </div>
  );
};
