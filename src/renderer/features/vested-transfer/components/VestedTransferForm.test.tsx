import { render, screen } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { describe, expect, it, vi } from 'vitest';

import { I18Provider } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/ui-kit';

import { VestedTransferForm } from './VestedTransferForm';

// The verdict itself comes from `createBatchCapacityCheck` (covered in
// shared/transactions and the bulk-transfers integration case); here only the
// store feeding the upload step of the form is replaced with a seedable one.
const { $maxRowsPerTransaction } = await vi.hoisted(async () => {
  const { createStore } = await import('effector');

  return { $maxRowsPerTransaction: createStore<number | null>(null) };
});

vi.mock('../model/form', async (importOriginal) => {
  const actual = await importOriginal<{ formModel: object }>();

  return { ...actual, formModel: { ...actual.formModel, $maxRowsPerTransaction } };
});

const renderForm = (maxRows: number | null) => {
  const scope = fork({ values: [[$maxRowsPerTransaction, maxRows]] });

  return render(
    <Provider value={scope}>
      <I18Provider>
        <ThemeProvider>
          <VestedTransferForm />
        </ThemeProvider>
      </I18Provider>
    </Provider>,
  );
};

describe('vested-transfer upload step batch verdict', () => {
  it('SP-54: tells how many rows fit when the file is too heavy for one transaction', async () => {
    renderForm(312);

    expect(
      await screen.findByText(
        'File is too large for a single transaction: only 312 rows fit. Please split the file into smaller batches and upload again.',
      ),
    ).toBeInTheDocument();
  });

  it('SP-54: says that not even one row fits when the capacity is zero', async () => {
    renderForm(0);

    expect(
      await screen.findByText('Not even one row of this file fits into a single transaction on this network.'),
    ).toBeInTheDocument();
  });

  it('SP-54: shows no capacity error while the whole file fits', () => {
    renderForm(null);

    expect(screen.queryByText(/File is too large for a single transaction/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not even one row of this file fits/)).not.toBeInTheDocument();
  });
});
