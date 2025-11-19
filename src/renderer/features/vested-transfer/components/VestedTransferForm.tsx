import { useUnit } from 'effector-react';
import { type FormEvent, memo, useMemo } from 'react';
import { Trans } from 'react-i18next';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { Alert, BodyText, Button, DetailRow, FootnoteText, Icon, InfoLink, InputHint } from '@/shared/ui';
import { AssetBalance, ChainSelect, SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, InputFile, Modal, ScrollArea } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import { VestingSchedulePreview } from '@/entities/vesting';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';
import { FileErrors } from '../types';
import { vestedTransferUtils } from '../utils';

import { VestingSchedulePreviewWithErrors } from './VestingSchedulePreviewWithErrors';

const CSV_TEMPLATE_LINK =
  'https://raw.githubusercontent.com/novasamatech/nova-spektr-utils/main/templates/vested-transfer-template.csv';

export const VestedTransferForm = () => {
  const { t } = useI18n();

  const { submit } = useForm(formModel.form);
  const showSignatories = useUnit(formModel.$showSignatories);
  const canSubmit = useUnit(formModel.$canSubmit);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const wallets = useUnit(walletModel.$wallets);
  const txErrors = useUnit(formModel.$txErrors);

  return (
    <>
      <ScrollArea>
        <form id="vested-transfer-form" onSubmit={submitForm}>
          <Box padding={[4, 5]} gap={4}>
            <TransactionValidationError errors={txErrors} wallets={wallets} />
            <NetworkSelect />
            {showSignatories && <Signatories />}
            <UploadCSV />
            <CSVErrors />
            <TotalAmountSection />
            <FeeSection />
          </Box>
        </form>
      </ScrollArea>
      <Modal.Footer>
        <Button form="vested-transfer-form" type="submit" disabled={!canSubmit}>
          {t('transfer.continueButton')}
        </Button>
      </Modal.Footer>
    </>
  );
};

export const NetworkSelect = memo(() => {
  const { t } = useI18n();

  const allChains = useUnit(formModel.$allChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('vestedTransfer.form.fields.network.label')}>
      <ChainSelect
        placeholder={t('vestedTransfer.form.fields.network.placeholder')}
        value={chain.value}
        options={allChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory, initiator },
  } = useForm(formModel.form);

  const signatories = useUnit(formModel.$signatories);
  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);

  const balances = useUnit(balanceModel.$balanceMap);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);

  const signatoriesWithBalance = useMemo(() => {
    if (!chain || !asset) {
      return [];
    }

    return signatories.map((signatory) => {
      const balance = balanceUtils.getBalance(balances, signatory.accountId, chain.chainId, asset.assetId);
      return { account: signatory, balance: transferableAmount(balance) };
    });
  }, [signatories, balances, chain, asset]);

  if (!chain || !asset) {
    return null;
  }

  return (
    <SignatorySelect
      signatory={signatory.value}
      signatories={signatoriesWithBalance}
      allAccounts={allAccounts}
      initiator={initiator.value}
      allWallets={allWallets}
      hasError={signatory.hasError}
      errorText={t(signatory.errorMessage)}
      network={{ chain, asset }}
      onChange={signatory.onChange}
    />
  );
};

const UploadCSV = () => {
  const { t } = useI18n();

  const fileErrors = useUnit(formModel.$fileErrors);
  const hasErrors = nonNullable(fileErrors) && nonNullable(fileErrors.details);

  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);
  const parsedFile = useUnit(formModel.$parsedFile);
  const vestingSchedule = useUnit(formModel.$vestingSchedule);

  const showPreview = !hasErrors && chain && asset && vestingSchedule && vestingSchedule.length > 0;
  const showPreviewWithErrors = hasErrors && parsedFile && parsedFile.length > 0;

  const downloadCSVWithErrors = () => {
    if (parsedFile && parsedFile.length > 0 && fileErrors && fileErrors.details) {
      vestedTransferUtils.downloadCSVWithErrors(parsedFile, fileErrors.details);
    }
  };

  return (
    <label className="flex w-full flex-col gap-y-2">
      <div className="gax-x-2 flex items-center justify-between">
        <FootnoteText className="text-text-tertiary">{t('vestedTransfer.form.fields.csvFile.label')}</FootnoteText>
        <div className="flex items-center gap-x-2">
          <InfoLink url={CSV_TEMPLATE_LINK} className="ml-2" iconName="import" iconPosition="right">
            {t('vestedTransfer.form.fields.csvFile.exampleButton')}
          </InfoLink>
          {showPreview && (
            <VestingSchedulePreview
              chain={chain}
              asset={asset}
              vestingSchedule={vestingSchedule}
              trigger={
                <Button
                  className="p-0"
                  size="sm"
                  variant="text"
                  suffixElement={<Icon size={16} name="eye" className="text-icon-primary" />}
                >
                  {t('vestedTransfer.parsedFile.buttons.openPreview')}
                </Button>
              }
            />
          )}
          {showPreviewWithErrors && fileErrors.details && (
            <VestingSchedulePreviewWithErrors
              vestingSchedule={parsedFile}
              errors={fileErrors.details}
              trigger={
                <Button
                  className="p-0"
                  size="sm"
                  variant="text"
                  suffixElement={<Icon size={16} name="eye" className="text-icon-primary" />}
                >
                  {t('vestedTransfer.parsedFile.buttons.openPreview')}
                </Button>
              }
              onDownloadClick={downloadCSVWithErrors}
            />
          )}
        </div>
      </div>
      <InputFile
        key={chain?.chainId}
        accept=".csv"
        placeholder={t('vestedTransfer.form.fields.csvFile.placeholder')}
        invalid={hasErrors}
        onChange={(file) => formModel.fileUploaded(file)}
      />
    </label>
  );
};

const CSVErrors = () => {
  const { t } = useI18n();

  const fileErrors = useUnit(formModel.$fileErrors);
  const parsedFile = useUnit(formModel.$parsedFile);

  if (nullable(fileErrors)) return null;

  if (fileErrors.code === FileErrors.INVALID_CSV_STRUCTURE) {
    return (
      <Alert active title={t('vestedTransfer.errors.csv.parseFailedTitle')} variant="error">
        <BodyText className="max-w-full tracking-tight">
          <Trans t={t} i18nKey="vestedTransfer.errors.csv.invalidStructureDescription" />
        </BodyText>
      </Alert>
    );
  }

  if (nullable(parsedFile)) return null;

  const downloadCSVWithErrors = () => {
    if (parsedFile.length > 0 && fileErrors.details) {
      vestedTransferUtils.downloadCSVWithErrors(parsedFile, fileErrors.details);
    }
  };

  if (fileErrors.code === FileErrors.INVALID_CSV_DATA && fileErrors?.details) {
    const errorCount = Object.values(fileErrors.details).reduce((count, rows) => count + rows.length, 0);

    return (
      <Alert active title={t('vestedTransfer.errors.csv.invalidDataTitle', { errorCount })} variant="error">
        {Object.entries(fileErrors?.details).map(([rowIndex, rowErrors]) =>
          rowErrors.map((rowError) => (
            <Alert.Item key={rowIndex}>
              {t('vestedTransfer.errors.csv.invalidDataRow', { row: rowIndex })}:&nbsp;
              {t(`vestedTransfer.errors.csv.rowErrors.${rowError}`)}
            </Alert.Item>
          )),
        )}
        <div className="flex flex-col">
          {t('vestedTransfer.errors.csv.parsedFileDownloadDescription')}
          <Button
            className="self-start p-0"
            size="sm"
            variant="text"
            suffixElement={<Icon size={16} name="import" className="text-icon-primary" />}
            onClick={downloadCSVWithErrors}
          >
            {t('vestedTransfer.parsedFile.buttons.parsedFile')}
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
};

const TotalAmountSection = () => {
  const { t } = useI18n();

  const amount = useUnit(formModel.$amount);
  const asset = useUnit(formModel.$asset);

  if (!amount || !asset) return null;

  return (
    <DetailRow label={t('vestedTransfer.form.fields.amount.label')}>
      <div className="flex flex-col items-end gap-y-0.5">
        <AssetBalance value={amount} asset={asset} showSymbol />
        <AssetFiatBalance asset={asset} amount={amount} />
      </div>
    </DetailRow>
  );
};

const FeeSection = () => {
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const hasMultisigAccount = useUnit(formModel.$hasMultisigAccount);

  if (!asset || !fee) return null;

  return (
    <>
      {hasMultisigAccount && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
      <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />
    </>
  );
};
