import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import multi_transfer_template_url from '@/shared/assets/templates/multi-transfer-template.csv?url';
import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nullable } from '@/shared/lib/utils';
import { Alert, Button, FootnoteText, Icon, InfoLink, InputHint } from '@/shared/ui';
import { InputFile } from '@/shared/ui-kit';
import { type ValidationIssue, MultiTransferCsvError } from '@/entities/multi-transfer';
import { MultiTransferPreview } from '@/widgets/multi-transfer-preview';
import { formModel } from '../model/form';
import { multiTransferUtils } from '../utils';

export const UploadCSV = () => {
  const { t } = useI18n();

  const { fields } = useForm(formModel.form);
  const chain = fields.chain;

  const fileName = useUnit(formModel.$fileName);
  const parsedCsv = useUnit(formModel.$parsedCsv);
  const parsedCsvRaw = useUnit(formModel.$parsedCsvRaw);
  const csvIssues = useUnit(formModel.$csvIssues);
  const csvError = useUnit(formModel.$csvError);

  const hasError = !nullable(csvError);
  const hasParsedCsv = parsedCsv && parsedCsv.length > 0;
  const showPreview = (nullable(csvError) || csvError === MultiTransferCsvError.DATA) && hasParsedCsv;
  const showDisabledPreview = !showPreview;

  const downloadCSVWithIssues = () => {
    if (parsedCsvRaw && csvIssues) {
      multiTransferUtils.downloadCsvWithIssues(parsedCsvRaw, csvIssues);
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
      {t('multiTransfer.parsedFile.buttons.openPreview')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-y-4">
      <label className="flex w-full flex-col gap-y-2">
        <div className="flex items-center justify-between gap-x-2">
          <FootnoteText className="text-text-tertiary">{t('multiTransfer.form.fields.csvFile.label')}</FootnoteText>
          <div className="flex items-center gap-x-2">
            <InfoLink
              url={multi_transfer_template_url}
              className="ml-2"
              iconName="import"
              iconPosition="right"
              download
            >
              {t('multiTransfer.form.fields.csvFile.exampleButton')}
            </InfoLink>
            {showPreview && parsedCsv && chain.value && (
              <MultiTransferPreview
                chain={chain.value}
                asset={getNativeAsset(chain.value.assets)}
                transfers={parsedCsv}
                issues={csvIssues}
                onDownloadClick={downloadCSVWithIssues}
              >
                {renderPreviewButton()}
              </MultiTransferPreview>
            )}
            {showDisabledPreview && renderPreviewButton({ disabled: true })}
          </div>
        </div>
        <InputFile
          key={chain.value?.chainId}
          accept=".csv"
          defaultFileName={fileName ?? undefined}
          placeholder={t('multiTransfer.form.fields.csvFile.placeholder')}
          invalid={hasError}
          disabled={nullable(chain.value)}
          onChange={(file) => {
            if (file && chain.value) {
              formModel.fileUploaded(file);
            }
          }}
        />
        {csvError === MultiTransferCsvError.STRUCTURE && (
          <InputHint variant="error" active>
            {t('multiTransfer.errors.csv.invalidStructureDescription')}
          </InputHint>
        )}
        {csvError === MultiTransferCsvError.DATA && nullable(csvIssues) && (
          <InputHint variant="error" active>
            {t('multiTransfer.errors.csv.invalidDataDescription')}
          </InputHint>
        )}
      </label>
      <ValidationsAlert />
    </div>
  );
};

const ValidationsAlert = () => {
  const { t } = useI18n();
  const parsedCsvRaw = useUnit(formModel.$parsedCsvRaw);
  const csvError = useUnit(formModel.$csvError);
  const csvIssues = useUnit(formModel.$csvIssues);

  const [isErrorAlertOpen, toggleErrorAlert] = useState(true);
  const [isWarningAlertOpen, toggleWarningAlert] = useState(true);

  useEffect(() => {
    if (csvError || csvIssues?.length) {
      toggleErrorAlert(true);
      toggleWarningAlert(true);
    }
  }, [csvError, csvIssues]);

  if (csvError === MultiTransferCsvError.STRUCTURE) {
    return null;
  }

  if (nullable(csvIssues) || csvIssues.length === 0) {
    return null;
  }

  const errors = csvIssues.filter((issue) => issue.severity === 'error');
  const warnings = csvIssues.filter((issue) => issue.severity === 'warning');
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  const downloadCSVWithIssues = () => {
    if (parsedCsvRaw && csvIssues) {
      multiTransferUtils.downloadCsvWithIssues(parsedCsvRaw, csvIssues);
    }
  };

  const DownloadSection = () => (
    <div className="flex flex-col">
      {t('multiTransfer.errors.csv.parsedFileDownloadDescription')}
      <Button
        className="self-start p-0"
        size="sm"
        variant="text"
        suffixElement={<Icon size={16} name="import" className="text-icon-primary" />}
        onClick={downloadCSVWithIssues}
      >
        {t('multiTransfer.parsedFile.buttons.parsedFile')}
      </Button>
    </div>
  );

  const renderIssueItem = (issue: ValidationIssue) => {
    const rowPrefix = t('multiTransfer.errors.csv.invalidDataRow', { row: issue.row });

    return (
      <Alert.Item key={multiTransferUtils.getIssueKey(issue)}>
        {rowPrefix}:&nbsp;
        {t(`multiTransfer.errors.csv.fieldErrors.${issue.message}`)}
      </Alert.Item>
    );
  };

  return (
    <>
      {hasErrors && (
        <Alert
          active={isErrorAlertOpen}
          title={t('multiTransfer.errors.csv.errorTitle', { count: errors.length })}
          variant="error"
          onClose={() => toggleErrorAlert(false)}
        >
          {errors.map(renderIssueItem)}
          <DownloadSection />
        </Alert>
      )}
      {hasWarnings && (
        <Alert
          active={isWarningAlertOpen}
          title={t('multiTransfer.errors.csv.warningTitle', { count: warnings.length })}
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
