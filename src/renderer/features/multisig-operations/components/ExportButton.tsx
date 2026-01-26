import { useUnit } from 'effector-react';
import { memo } from 'react';

import { useI18n } from '@/shared/i18n';
import { IconButton } from '@/shared/ui';
import { Tooltip } from '@/shared/ui-kit';
import { operationsContextModel } from '../model/context';
import { exportModel } from '../model/export';

export const ExportButton = memo(() => {
  const { t } = useI18n();

  const filteredOperations = useUnit(operationsContextModel.$filteredOperations);
  const isExporting = useUnit(exportModel.$isExporting);

  const hasOperations = filteredOperations.length > 0;

  const handleExport = () => {
    exportModel.exportToCsv();
  };

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton name="export" disabled={!hasOperations || isExporting} onClick={handleExport} />
      </Tooltip.Trigger>
      <Tooltip.Content>{t('operations.export.tooltip')}</Tooltip.Content>
    </Tooltip>
  );
});
