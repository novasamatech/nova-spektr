import { useUnit } from 'effector-react';
import { useMemo, useState } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { Button, CaptionText, FootnoteText, Icon, InputHint } from '@/shared/ui';
import { InputFile, ScrollArea } from '@/shared/ui-kit';
import { type Column, Table } from '@/shared/ui-kit/Table';
import { MultiTransferCsvError, MultiTransferFieldError, type MultiTransferRow } from '@/entities/multi-transfer';
import { formModel } from '../model/form';

const ISSUE_MESSAGES: Record<MultiTransferFieldError, string> = {
  [MultiTransferFieldError.INVALID_SS58_ADDRESS]: 'Invalid SS58 address format',
  [MultiTransferFieldError.INVALID_VALUE]: 'Invalid value',
  [MultiTransferFieldError.OUT_OF_RANGE]: 'Value out of range',
  [MultiTransferFieldError.UNKNOWN_ERROR]: 'Unknown error',
};

export const UploadCSV = () => {
  const { t } = useI18n();

  const { fields } = useForm(formModel.form);
  const chain = fields.chain;

  const fileName = useUnit(formModel.$fileName);
  const parsedCsv = useUnit(formModel.$parsedCsv);
  const csvIssues = useUnit(formModel.$csvIssues);
  const csvError = useUnit(formModel.$csvError);
  const [showPreview, setShowPreview] = useState(false);

  const hasIssues = (csvIssues?.length ?? 0) > 0;
  const previewRows = useMemo(() => (parsedCsv ?? []).slice(0, 20), [parsedCsv]);

  const columns: Column<MultiTransferRow & { index: number }>[] = useMemo(
    () => [
      {
        key: 'index',
        title: '#',
        width: '48px',
        render: (_, row) => <span className="text-text-tertiary">{row.index}</span>,
      },
      {
        key: 'recipient',
        title: t('multiTransfer.parsedFile.headers.recipient', 'Recipient'),
        render: (_, row) => <span className="break-all text-text-primary">{row.recipient}</span>,
      },
      {
        key: 'amount',
        title: t('multiTransfer.parsedFile.headers.amount', 'Amount'),
        render: (_, row) => <span className="text-text-primary">{row.amount.toString()}</span>,
      },
    ],
    [t],
  );

  // const renderCsvError = () => {
  //   if (nullable(csvError)) return null;
  //
  //   const description =
  //     csvError === MultiTransferCsvError.STRUCTURE
  //       ? t(
  //           'multiTransfer.errors.csv.invalidStructureDescription',
  //           'File couldn’t be read or contains invalid CSV structure. Check column headers and formatting, then try uploading again.',
  //         )
  //       : t(
  //           'multiTransfer.errors.csv.invalidDataDescription',
  //           'File couldn’t be read. Please check data formatting and try again.',
  //         );
  //
  //   if (csvError === MultiTransferCsvError.STRUCTURE) {
  //     return (
  //       <InputHint variant="error" active>
  //         {t(
  //           'multiTransfer.errors.csv.invalidStructureDescription',
  //           'File couldn’t be read or contains invalid CSV structure. Check column headers and formatting, then try uploading again.',
  //         )}
  //       </InputHint>
  //     );
  //   }
  //
  //   return null;
  // };

  const renderIssues = () => {
    if (!hasIssues || nullable(csvIssues)) return null;

    return (
      <div className="bg-surface-contrast flex flex-col gap-y-2 rounded-lg border border-filter-border px-3 py-2">
        <div className="flex items-center gap-x-2">
          <Icon name="warn" size={16} className="text-icon-warning" />
          <FootnoteText className="text-text-warning">
            {t('multiTransfer.errors.csv.issuesTitle', {
              count: csvIssues.length,
              defaultValue: 'Found {count} errors',
            })}
          </FootnoteText>
        </div>
        <div className="flex flex-col gap-y-1">
          {csvIssues.map((issue) => (
            <CaptionText key={`${issue.row}-${issue.path}`} className="text-text-secondary">
              {t('multiTransfer.errors.csv.issueLine', {
                row: issue.row,
                path: issue.path,
                message: ISSUE_MESSAGES[issue.message] ?? issue.message,
                defaultValue: 'Row {row} — {path}: {message}',
              })}
            </CaptionText>
          ))}
        </div>
      </div>
    );
  };

  const renderPreview = () => {
    if (!parsedCsv || parsedCsv.length === 0 || !showPreview) return null;

    const tableData = previewRows.map((row, idx) => ({ ...row, index: idx + 1 }));

    return (
      <div className="bg-surface-contrast flex flex-col gap-y-2 rounded-lg border border-filter-border px-3 py-2">
        <div className="flex items-center justify-between gap-x-2">
          <FootnoteText className="text-text-secondary">
            {t('multiTransfer.parsedFile.title', 'Parsed file')}{' '}
            <span className="text-text-tertiary">({parsedCsv.length})</span>
          </FootnoteText>
          <Button size="sm" variant="text" onClick={() => setShowPreview(false)}>
            {t('multiTransfer.parsedFile.buttons.hide', 'Hide')}
          </Button>
        </div>
        <div className="max-h-64">
          <ScrollArea>
            <Table columns={columns} data={tableData} />
          </ScrollArea>
        </div>
      </div>
    );
  };

  const hasError = !nullable(csvError);
  const hasParsedCsv = parsedCsv && parsedCsv.length > 0;
  const showPreviewButton = (nullable(csvError) || csvError === MultiTransferCsvError.DATA) && hasParsedCsv;

  const renderPreviewButton = ({ disabled = false }: { disabled?: boolean } = {}) => (
    <Button
      className="p-0"
      size="sm"
      variant="text"
      disabled={disabled}
      suffixElement={<Icon size={16} name="eye" className="text-icon-primary" />}
      onClick={() => setShowPreview((prev) => !prev)}
    >
      {showPreview
        ? t('multiTransfer.parsedFile.buttons.hide', 'Hide preview')
        : t('multiTransfer.parsedFile.buttons.openPreview', 'Preview')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-y-4">
      <label className="flex w-full flex-col gap-y-2">
        <div className="flex items-center justify-between gap-x-2">
          <FootnoteText className="text-text-tertiary">
            {t('multiTransfer.form.fields.csvFile.label', 'Data table file')}
          </FootnoteText>
          <div className="flex items-center gap-x-2">
            {showPreviewButton && renderPreviewButton()}
            {!showPreviewButton && renderPreviewButton({ disabled: true })}
          </div>
        </div>
        <InputFile
          key={chain.value?.chainId}
          accept=".csv"
          defaultFileName={fileName ?? undefined}
          placeholder={t('multiTransfer.form.fields.csvFile.placeholder', 'Select CSV file on your computer')}
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
            {t(
              'multiTransfer.errors.csv.invalidStructureDescription',
              "File couldn't be read or contains invalid CSV structure. Check column headers and formatting, then try uploading again.",
            )}
          </InputHint>
        )}
      </label>
      {renderIssues()}
      {renderPreview()}
    </div>
  );
};
