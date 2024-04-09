import { useForm } from 'effector-forms';
import { FormEvent } from 'react';
import { useUnit } from 'effector-react';

import { useI18n } from '@app/providers';
import { accountUtils, AccountAddress, ProxyWalletAlert } from '@entities/wallet';
import { toAddress, toShortAddress, formatBalance } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';
import { DropdownOption } from '@shared/ui/types';
import { formModel } from '../model/form-model';
import { AssetFiatBalance } from '@entities/price/ui/AssetFiatBalance';
import { FeeLoader } from '@entities/transaction';
import { priceProviderModel } from '@entities/price';
import { Select, Input, Button, InputHint, MultiSelect, Icon, DetailRow, FootnoteText, Tooltip } from '@shared/ui';

type Props = {
  onGoBack: () => void;
};

export const NominateForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(formModel.$bondForm);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="pb-4 px-5 w-modal">
      <form id="transfer-form" className="flex flex-col gap-y-4 mt-4" onSubmit={submitForm}>
        <ProxyFeeAlert />
        <AccountsSelector />
        <SignatorySelector />
        <Description />
      </form>
      <div className="flex flex-col gap-y-6 pt-6 pb-4">
        <FeeSection />
      </div>
      <ActionsSection onGoBack={onGoBack} />
    </div>
  );
};

const ProxyFeeAlert = () => {
  const {
    fields: { shards },
  } = useForm(formModel.$bondForm);

  const feeData = useUnit(formModel.$feeData);
  const balance = useUnit(formModel.$proxyBalance);
  const network = useUnit(formModel.$networkStore);
  const proxyWallet = useUnit(formModel.$proxyWallet);

  if (!network || !proxyWallet || !shards.hasError()) return null;

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

const AccountsSelector = () => {
  const { t } = useI18n();

  const {
    fields: { shards },
  } = useForm(formModel.$bondForm);

  const accounts = useUnit(formModel.$accounts);
  const network = useUnit(formModel.$networkStore);

  if (!network || accounts.length <= 1) return null;

  const options = accounts.map(({ account, balance }) => {
    const isShard = accountUtils.isShardAccount(account);
    const address = toAddress(account.accountId, { prefix: network.chain.addressPrefix });

    return {
      id: account.id.toString(),
      value: account,
      element: (
        <div className="flex justify-between w-full" key={account.id}>
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? toShortAddress(address, 16) : account.name}
            canCopy={false}
          />
          <AssetBalance value={balance} asset={network.asset} />
        </div>
      ),
    };
  });

  return (
    <div className="flex flex-col gap-y-2">
      <MultiSelect
        label={t('staking.bond.accountLabel')}
        placeholder={t('staking.bond.accountPlaceholder')}
        multiPlaceholder={t('staking.bond.manyAccountsPlaceholder')}
        invalid={shards.hasError()}
        selectedIds={shards.value.map((acc) => acc.id.toString())}
        options={options}
        onChange={(values) => shards.onChange(values.map(({ value }) => value))}
      />
      <InputHint variant="error" active={shards.hasError()}>
        {t(shards.errorText())}
      </InputHint>
    </div>
  );
};

const SignatorySelector = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(formModel.$bondForm);

  const signatories = useUnit(formModel.$signatories);
  const isMultisig = useUnit(formModel.$isMultisig);
  const network = useUnit(formModel.$networkStore);

  if (!network || !isMultisig || signatories.length === 0) return null;

  const options = signatories[0].reduce<DropdownOption[]>((acc, { signer, balance }) => {
    if (!signer?.id) return acc;

    const isShard = accountUtils.isShardAccount(signer);
    const address = toAddress(signer.accountId, { prefix: network.chain.addressPrefix });

    acc.push({
      id: signer.id.toString(),
      value: signer,
      element: (
        <div className="flex justify-between items-center w-full">
          <AccountAddress
            size={20}
            type="short"
            address={address}
            name={isShard ? address : signer.name}
            canCopy={false}
          />
          <AssetBalance value={balance} asset={network.asset} />
        </div>
      ),
    });

    return acc;
  }, []);

  return (
    <div className="flex flex-col gap-y-2">
      <Select
        label={t('operation.selectSignatoryLabel')}
        placeholder={t('operation.selectSignatory')}
        selectedId={signatory.value.id?.toString()}
        options={options}
        invalid={signatory.hasError()}
        onChange={({ value }) => signatory.onChange(value)}
      />
      <InputHint variant="error" active={signatory.hasError()}>
        {t(signatory.errorText())}
      </InputHint>
    </div>
  );
};

const Description = () => {
  const { t } = useI18n();

  const {
    fields: { description },
  } = useForm(formModel.$bondForm);

  const isMultisig = useUnit(formModel.$isMultisig);

  if (!isMultisig) return null;

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
    fields: { shards },
  } = useForm(formModel.$bondForm);

  const network = useUnit(formModel.$networkStore);
  const feeData = useUnit(formModel.$feeData);
  const isFeeLoading = useUnit(formModel.$isFeeLoading);
  const isMultisig = useUnit(formModel.$isMultisig);

  const fiatFlag = useUnit(priceProviderModel.$fiatFlag);

  if (!network || shards.value.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-2">
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

const ActionsSection = ({ onGoBack }: Props) => {
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
