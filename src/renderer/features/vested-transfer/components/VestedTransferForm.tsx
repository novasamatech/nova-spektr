import { BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type FormEvent, memo, useEffect, useMemo, useState } from 'react';

import vested_transfer_template_url from '@/shared/assets/templates/vested-transfer-template.csv?url';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { nonNullable, nullable, transferableAmount } from '@/shared/lib/utils';
import { Alert, Button, DetailRow, FootnoteText, Icon, InfoLink, InputHint } from '@/shared/ui';
import { AssetBalance, ChainSelect, SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Box, Field, InputFile, Modal, ScrollArea } from '@/shared/ui-kit';
import { accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { networkModel } from '@/entities/network';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel, MultisigDepositFee } from '@/entities/transaction';
import {
  type ValidationIssue,
  CliffMinVestedTransferError,
  MinVestedTransferError,
  VestingCsvError,
  VestingFieldError,
  VestingSchedulePreview,
} from '@/entities/vesting';
import { walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';
import { vestedTransferUtils } from '../utils';

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
            <ValidationsAlert />
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

  const availableChains = useUnit(formModel.$availableChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('vestedTransfer.form.fields.network.label')}>
      <ChainSelect
        placeholder={t('vestedTransfer.form.fields.network.placeholder')}
        value={chain.value}
        options={availableChains}
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

  const chain = useUnit(formModel.$chain);
  const asset = useUnit(formModel.$asset);
  const fileName = useUnit(formModel.$fileName);
  const parsedCsv = useUnit(formModel.$parsedCsv);
  const csvError = useUnit(formModel.$csvError);
  const csvIssues = useUnit(formModel.$csvIssues);
  const apis = useUnit(networkModel.$apis);
  const minVestedTransfer = useUnit(formModel.$minVestedTransfer);

  const timelineChainId = chain?.additional?.timelineChain;
  const timelineApi = nonNullable(timelineChainId) ? (apis[timelineChainId] ?? null) : ((chain && apis[chain.chainId]) ?? null);

  const hasError = nonNullable(csvError);
  const hasParsedCsv = parsedCsv && parsedCsv.length > 0;

  const showPreview = (nullable(csvError) || csvError === VestingCsvError.DATA) && hasParsedCsv;
  const showDisabledPreview = !showPreview;

  const downloadCSVWithIssues = () => {
    if (hasParsedCsv && csvIssues) {
      vestedTransferUtils.downloadCsvWithIssues(parsedCsv, csvIssues);
    }
  };

  const renderPreviewButton = ({ disabled = false }: { disabled?: boolean } = {}) => (
    <Button
      className="p-0"
      size="sm"
      variant="text"
      disabled={disabled}
      suffixElement={<Icon size={16} name="eye" className="text-icon-primary" />}
    >
      {t('vestedTransfer.parsedFile.buttons.openPreview')}
    </Button>
  );

  return (
    <label className="flex w-full flex-col gap-y-2">
      <div className="flex items-center justify-between gap-x-2">
        <FootnoteText className="text-text-tertiary">{t('vestedTransfer.form.fields.csvFile.label')}</FootnoteText>
        <div className="flex items-center gap-x-2">
          <InfoLink url={vested_transfer_template_url} className="ml-2" iconName="import" iconPosition="right" download>
            {t('vestedTransfer.form.fields.csvFile.exampleButton')}
          </InfoLink>
          {showPreview && (
            <VestingSchedulePreview
              timelineApi={timelineApi}
              chain={chain}
              asset={asset}
              vestingSchedule={parsedCsv}
              issues={csvIssues}
              minVestedTransfer={minVestedTransfer}
              onDownloadClick={downloadCSVWithIssues}
            >
              {renderPreviewButton()}
            </VestingSchedulePreview>
          )}
          {showDisabledPreview && renderPreviewButton({ disabled: true })}
        </div>
      </div>
      <InputFile
        key={chain?.chainId}
        accept=".csv"
        defaultFileName={fileName ?? undefined}
        placeholder={t('vestedTransfer.form.fields.csvFile.placeholder')}
        invalid={hasError}
        onChange={(file) => formModel.fileUploaded(file)}
      />
    </label>
  );
};

const ValidationsAlert = () => {
  const { t } = useI18n();
  const parsedCsv = useUnit(formModel.$parsedCsv);
  const csvError = useUnit(formModel.$csvError);
  const csvIssues = useUnit(formModel.$csvIssues);
  const minVestedTransfer = useUnit(formModel.$minVestedTransfer);
  const asset = useUnit(formModel.$asset);

  const [isErrorAlertOpen, toggleErrorAlert] = useState(true);
  const [isWarningAlertOpen, toggleWarningAlert] = useState(true);

  useEffect(() => {
    if (csvError || csvIssues?.length) {
      toggleErrorAlert(true);
      toggleWarningAlert(true);
    }
  }, [csvError, csvIssues]);

  if (csvError === VestingCsvError.STRUCTURE) {
    return (
      <InputHint variant="error" active>
        {t('vestedTransfer.errors.csv.invalidStructureDescription')}
      </InputHint>
    );
  }

  if (nullable(csvIssues) || csvIssues.length === 0) {
    return null;
  }

  const errors = csvIssues.filter((issue) => issue.severity === 'error');
  const warnings = csvIssues.filter((issue) => issue.severity === 'warning');
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const downloadCSVWithIssues = () => {
    if (parsedCsv?.length) {
      vestedTransferUtils.downloadCsvWithIssues(parsedCsv, csvIssues);
    }
  };

  const DownloadSection = () => (
    <div className="flex flex-col">
      {t('vestedTransfer.errors.csv.parsedFileDownloadDescription')}
      <Button
        className="self-start p-0"
        size="sm"
        variant="text"
        suffixElement={<Icon size={16} name="import" className="text-icon-primary" />}
        onClick={downloadCSVWithIssues}
      >
        {t('vestedTransfer.parsedFile.buttons.parsedFile')}
      </Button>
    </div>
  );

  const renderIssueItem = (issue: ValidationIssue) => {
    const rowPrefix = t('vestedTransfer.errors.csv.invalidDataRow', { row: issue.row });

    return (
      <Alert.Item key={issue.row}>
        {rowPrefix}:&nbsp;
        {t(`vestedTransfer.errors.csv.fieldErrors.${issue.message}`)}
      </Alert.Item>
    );
  };

  const renderErrorItem = (issue: ValidationIssue) => {
    const row = parsedCsv?.[issue.row - 1];
    const remainingLockedAmount =
      row?.locked && row?.unlockedAtStartBlock
        ? new BN(row.locked).sub(new BN(row.unlockedAtStartBlock)).toString()
        : null;

    const isMinVestedTransferError =
      issue.message === VestingFieldError.MIN_VESTED_TRANSFER && nonNullable(minVestedTransfer) && nonNullable(asset);

    const isCliffMinVestedTransferError =
      issue.message === VestingFieldError.CLIFF_MIN_VESTED_TRANSFER &&
      nonNullable(minVestedTransfer) &&
      nonNullable(asset) &&
      nonNullable(remainingLockedAmount);

    if (isMinVestedTransferError || isCliffMinVestedTransferError) {
      const rowPrefix = t('vestedTransfer.errors.csv.invalidDataRow', { row: issue.row });
      return (
        <Alert.Item key={issue.row}>
          {rowPrefix}:&nbsp;
          {isMinVestedTransferError ? (
            <MinVestedTransferError minVestedTransfer={minVestedTransfer} asset={asset} />
          ) : (
            <CliffMinVestedTransferError
              minVestedTransfer={minVestedTransfer}
              remainingLockedAmount={remainingLockedAmount!}
              asset={asset}
            />
          )}
        </Alert.Item>
      );
    }

    return renderIssueItem(issue);
  };

  return (
    <>
      {hasErrors && (
        <Alert
          active={isErrorAlertOpen}
          title={t('vestedTransfer.errors.csv.errorTitle', { count: errors.length })}
          variant="error"
          onClose={() => toggleErrorAlert(false)}
        >
          {errors.map(renderErrorItem)}
          <DownloadSection />
        </Alert>
      )}
      {hasWarnings && (
        <Alert
          active={isWarningAlertOpen}
          title={t('vestedTransfer.errors.csv.warningTitle', { count: warnings.length })}
          variant="warn"
          onClose={() => toggleWarningAlert(false)}
        >
          {warnings.map(renderIssueItem)}
          <DownloadSection />
        </Alert>
      )}
    </>
  );
};

const TotalAmountSection = () => {
  const { t } = useI18n();

  const amount = useUnit(formModel.$amount);
  const asset = useUnit(formModel.$asset);

  if (nullable(amount) || nullable(asset)) return null;

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
  const multisigDeposit = useUnit(formModel.$multisigDeposit);
  const hasMultisigAccount = useUnit(formModel.$hasMultisigAccount);
  const asset = useUnit(formModel.$asset);

  if (nullable(asset)) return null;

  return (
    <>
      {hasMultisigAccount && <MultisigDepositFee asset={asset} multisigDeposit={multisigDeposit} />}
      <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />
    </>
  );
};
