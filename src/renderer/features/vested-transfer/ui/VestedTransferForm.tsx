import { useUnit } from 'effector-react';
import { capitalize } from 'lodash';
import { type FormEvent } from 'react';
import { Trans } from 'react-i18next';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset } from '@/shared/lib/utils';
import { Alert, BodyText, Button, DetailRow, FootnoteText, InfoLink } from '@/shared/ui';
import { AssetBalance, TransactionValidationError } from '@/shared/ui-entities';
import { Box, InputFile, Modal } from '@/shared/ui-kit';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel } from '@/entities/transaction';
import { walletModel } from '@/entities/wallet';
import { VestingScheduleFileErrors } from '../lib/types';
import { formModel } from '../model/form';

import { InitiatorSelect } from './InitiatorSelect';
import { NetworkSelect } from './NetworkSelect';
import { SignatorySelect } from './SignatorySelect';

const CSV_TEMPLATE_LINK = '';

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
    <form id="vested-transfer-form" onSubmit={submitForm}>
      <Box padding={[4, 5]} gap={4}>
        <TransactionValidationError errors={txErrors} wallets={wallets} />
        <NetworkSelect />
        <InitiatorSelect />
        {showSignatories && <SignatorySelect />}
        <UploadCSV />
        <CSVErrors />
        <TotalAmountSection />
        <FeeSection />
      </Box>
      <Modal.Footer>
        <Button form="vested-transfer-form" type="submit" disabled={!canSubmit}>
          {t('transfer.continueButton')}
        </Button>
      </Modal.Footer>
    </form>
  );
};

const UploadCSV = () => {
  const { t } = useI18n();

  const csvValidationErrors = false;

  return (
    <label className="flex w-full flex-col gap-y-2">
      <div className="gax-x-2 flex items-center justify-between text-footnote font-medium text-text-tertiary">
        <FootnoteText className="text-text-tertiary">{t('vestedTransfer.form.fields.csvFile.label')}</FootnoteText>
        <InfoLink url={CSV_TEMPLATE_LINK} className="ml-2" iconName="import" iconPosition="right">
          {t('vestedTransfer.form.fields.csvFile.exampleButton')}
        </InfoLink>
      </div>
      <InputFile
        accept=".csv"
        placeholder={t('vestedTransfer.form.fields.csvFile.placeholder')}
        invalid={csvValidationErrors}
        onChange={(file) => formModel.fileUploaded(file)}
      />
    </label>
  );
};

const CSVErrors = () => {
  const { t } = useI18n();

  const csvErrors = useUnit(formModel.$csvErrors);

  if (!csvErrors) return null;

  if (csvErrors.code === VestingScheduleFileErrors.INVALID_CSV_STRUCTURE) {
    return (
      <Alert active title={t('vestedTransfer.errors.csv.parseFailedTitle')} variant="error">
        <BodyText className="max-w-full tracking-tight">
          <Trans t={t} i18nKey="vestedTransfer.errors.csv.invalidStructureDescription" />
        </BodyText>
      </Alert>
    );
  }

  if (csvErrors.code === VestingScheduleFileErrors.INVALID_CSV_DATA && csvErrors?.details) {
    const errorCount = Object.values(csvErrors.details).reduce((count, rows) => count + rows.length, 0);

    return (
      <Alert active title={t('vestedTransfer.errors.csv.invalidDataTitle', { errorCount })} variant="error">
        {Object.entries(csvErrors?.details).map(([error, rows]) => (
          <Alert.Item key={error}>
            <div>
              {capitalize(
                rows
                  .map((row) => t('vestedTransfer.errors.csv.invalidDataRow', { row }))
                  .join(', ')
                  .concat(':'),
              )}
            </div>
            <div>{t(`vestedTransfer.errors.csv.rowErrors.${error}`)}</div>
          </Alert.Item>
        ))}
      </Alert>
    );
  }

  if (csvErrors.code === VestingScheduleFileErrors.CHAIN_NOT_SELECTED) {
    return (
      <Alert active title={t('vestedTransfer.errors.csv.parseFailedTitle')} variant="error">
        <BodyText className="max-w-full tracking-tight">
          <Trans t={t} i18nKey="vestedTransfer.errors.csv.missingChainDescription" />
        </BodyText>
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

  if (!asset) return null;

  return <FeeWithLabel asset={asset} fee={fee} isLoading={pendingFee} />;
};
