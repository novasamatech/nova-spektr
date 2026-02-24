import { createEffect, createEvent, createStore, sample } from 'effector';

import { type Chain, type ChainId } from '@/shared/core';
import { downloadFiles } from '@/shared/lib/utils';
import { type MultisigOperation } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { createCsvBlob, generateCsv, generateExportFilename } from '../lib/csv-export';

import { type TabFilter, operationsContextModel } from './context';

const exportToCsv = createEvent();
const $isExporting = createStore(false);

type ExportParams = {
  operations: MultisigOperation[];
  chains: Record<ChainId, Chain>;
  tab: TabFilter;
};

const exportToCsvFx = createEffect(({ operations, chains, tab }: ExportParams) => {
  if (operations.length === 0) {
    return;
  }

  const csvContent = generateCsv(operations, { chains });
  const blob = createCsvBlob(csvContent);
  const filename = generateExportFilename(operations.length, tab);

  downloadFiles([{ blob, fileName: filename }]);
});

sample({
  clock: exportToCsv,
  source: {
    filteredOperations: operationsContextModel.$filteredOperations,
    chains: networkModel.$chains,
    tab: operationsContextModel.$tab,
  },
  fn: ({ filteredOperations, chains, tab }) => ({
    operations: filteredOperations.map(item => item.operation),
    chains,
    tab,
  }),
  target: exportToCsvFx,
});

$isExporting.on(exportToCsvFx, () => true).on(exportToCsvFx.finally, () => false);

export const exportModel = {
  exportToCsv,
  $isExporting,
};
