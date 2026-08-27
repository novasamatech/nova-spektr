import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type HexString } from '@/shared/core';
import { type MultisigOperation } from '@/domains/network';

import { OperationAdvancedDetails, getCallDetailsLabelKeys } from './OperationAdvancedDetails';

const stores = vi.hoisted(() => ({ chains: Symbol('chains'), hiddenIds: Symbol('hidden') }));

vi.mock('effector-react', () => ({
  useUnit: (store: symbol) => (store === stores.hiddenIds ? [] : {}),
}));

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/shared/ui', () => ({
  DetailRow: ({ label, children }: { label: string; children: ReactNode }) => (
    <div data-testid={`row-${label}`}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  ),
  FootnoteText: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  SmallTitleText: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  Icon: () => null,
}));

vi.mock('@/shared/ui/Buttons', () => ({
  IconButton: () => null,
}));

vi.mock('@/shared/ui-kit', () => ({
  Copy: ({ children }: { children: ReactNode }) => children,
  Modal: () => null,
  Tooltip: Object.assign(({ children }: { children: ReactNode }) => children, {
    Trigger: ({ children }: { children: ReactNode }) => children,
    Content: ({ children }: { children: ReactNode }) => children,
  }),
  useNotification: () => ({ toast: { success: vi.fn() } }),
}));

vi.mock('@/shared/ui-kit/Json/Json', () => ({ Json: () => null }));

vi.mock('@/domains/network', () => ({
  transactionService: { getCoreCallData: () => null },
}));

vi.mock('@/entities/network', () => ({
  networkModel: { $chains: stores.chains },
  useNetworkData: () => ({ api: null }),
}));

vi.mock('@/entities/operations', () => ({
  operationDetailsUtils: { getMultisigExtrinsicLink: () => null },
}));

vi.mock('@/entities/transaction', () => ({
  transactionService: { createCallFromCallData: () => null, formatCall: () => null },
}));

vi.mock('../model/context', () => ({
  operationsContextModel: { $hiddenOperationIds: stores.hiddenIds, hideOperation: vi.fn(), unhideOperation: vi.fn() },
}));

const callHash = '0x1234' as HexString;

const makeOperation = (overrides: Partial<MultisigOperation> = {}): MultisigOperation =>
  ({
    id: 'op-1',
    chainId: '0x00',
    status: 'pending',
    callHash,
    callData: null,
    transaction: null,
    section: null,
    method: null,
    blockCreated: 100,
    indexCreated: 0,
    events: [],
    timestamp: 0,
    ...overrides,
  }) as unknown as MultisigOperation;

describe('getCallDetailsLabelKeys', () => {
  it('uses regular call labels when the displayed call was not unwrapped', () => {
    expect(getCallDetailsLabelKeys({ callHash }, { callHash })).toEqual({
      callHash: 'operation.details.callHash',
      callData: 'operation.details.callData',
    });
  });

  it('uses core call labels when the displayed call was unwrapped from an outer call', () => {
    expect(getCallDetailsLabelKeys({ callHash: '0xabcd' as HexString }, { callHash })).toEqual({
      callHash: 'operation.details.coreCallHash',
      callData: 'operation.details.coreCallData',
    });
  });
});

describe('OperationAdvancedDetails', () => {
  it('warns that indexer call data was discarded when its hash did not match', () => {
    render(<OperationAdvancedDetails operation={makeOperation({ callDataMismatch: true })} />);

    expect(screen.getByTestId('row-operation.details.callData')).toHaveTextContent(
      'operation.callData.indexerMismatch',
    );
  });

  it('shows no mismatch warning when call data is simply missing', () => {
    render(<OperationAdvancedDetails operation={makeOperation()} />);

    expect(screen.queryByText('operation.callData.indexerMismatch')).not.toBeInTheDocument();
  });
});
