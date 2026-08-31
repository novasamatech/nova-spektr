import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type Chain, type HexString } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

import { CallDataModal } from './CallDataModal';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/lib/utils', () => ({
  validateCallData: () => false,
}));

vi.mock('@/shared/ui', () => ({
  Alert: Object.assign(
    ({ variant, title, children }: { variant: string; title: string; children: ReactNode }) => (
      <div data-testid={`alert-${variant}`}>
        <b>{title}</b>
        {children}
      </div>
    ),
    { Item: ({ children }: { children: ReactNode }) => <p>{children}</p> },
  ),
  Button: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  InputHint: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SmallTitleText: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
}));

// Render the dialog inline: the trigger/open state is not what's under test.
vi.mock('@/shared/ui-kit', () => ({
  Input: () => <input />,
  Modal: Object.assign(({ children }: { children: ReactNode }) => <div>{children}</div>, {
    Trigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    Title: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
    Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  }),
  useNotification: () => ({ toast: { success: vi.fn() } }),
}));

vi.mock('@/shared/ui-kit/Json/Json', () => ({ Json: () => null }));

vi.mock('@/domains/network', () => ({
  multisigOperation: { updateCallData: vi.fn() },
  multisigOperationService: { findInnerExtrinsicCall: () => null },
  transactionService: { createExtrinsicFromCallData: () => null },
}));

vi.mock('@/entities/transaction', () => ({
  transactionService: { createCallFromCallData: () => null, formatCall: () => null },
}));

const makeOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation =>
  ({
    id: 'op-1',
    chainId: '0x00',
    multisigAccountId: '0xms',
    callHash: '0x1234' as HexString,
    callData: null,
    transaction: null,
    ...overrides,
  }) as unknown as MultisigOperation;

const renderModal = (operation: MultisigOperation) =>
  render(
    <CallDataModal operation={operation} api={{} as any} chain={{} as Chain}>
      <button>open</button>
    </CallDataModal>,
  );

describe('CallDataModal', () => {
  it('explains the generic missing-call-data case with the info hint', () => {
    renderModal(makeOperation());

    expect(screen.getByTestId('alert-info')).toHaveTextContent('operation.callData.hintDescription');
    expect(screen.queryByText('operation.callData.indexerMismatch')).toBeNull();
  });

  it('warns that the indexer call data was discarded instead of the generic hint on a mismatch', () => {
    renderModal(makeOperation({ callDataMismatch: true }));

    expect(screen.getByTestId('alert-warn')).toHaveTextContent('operation.callData.indexerMismatch');
    expect(screen.queryByText('operation.callData.hintDescription')).toBeNull();
  });
});
