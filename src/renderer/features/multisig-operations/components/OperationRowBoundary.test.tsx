import { render, screen } from '@testing-library/react';
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type MultisigOperation } from '@/domains/network';

import { OperationRowBoundary } from './OperationRowBoundary';

vi.mock('@/shared/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const FALLBACK_KEY = 'operations.rowUnavailable';

// Only the identity matters here: the boundary keys its reset on the object itself.
const createOperation = (id: string) => ({ id }) as unknown as MultisigOperation;

const BROKEN_ID = 'broken';

const Row = ({ operation }: { operation: MultisigOperation }) => {
  if (operation.id === BROKEN_ID) {
    throw new Error('Cannot render operation');
  }

  return <div>row {operation.id}</div>;
};

describe('OperationRowBoundary', () => {
  let consoleError: MockInstance<typeof console.error>;

  beforeEach(() => {
    // React and the boundary itself report the caught error through console.error; keep the test output clean.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('replaces only the throwing row with the fallback', () => {
    const operations = [createOperation('first'), createOperation(BROKEN_ID), createOperation('third')];

    render(
      <>
        {operations.map(operation => (
          <OperationRowBoundary key={operation.id} operation={operation}>
            <Row operation={operation} />
          </OperationRowBoundary>
        ))}
      </>,
    );

    expect(screen.getByText('row first')).toBeInTheDocument();
    expect(screen.getByText('row third')).toBeInTheDocument();
    expect(screen.queryByText(`row ${BROKEN_ID}`)).not.toBeInTheDocument();
    expect(screen.getAllByText(FALLBACK_KEY)).toHaveLength(1);
    expect(consoleError).toHaveBeenCalledWith(
      '[multisig-operations] operation row failed to render',
      expect.objectContaining({ id: BROKEN_ID }),
      expect.any(Error),
    );
  });

  it('SP-10: shows the row-unavailable text and logs the id, chainId and callHash of the broken row', () => {
    const broken = {
      id: BROKEN_ID,
      chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
      callHash: '0xdeadbeef',
    } as unknown as MultisigOperation;

    render(
      <OperationRowBoundary operation={broken}>
        <Row operation={broken} />
      </OperationRowBoundary>,
    );

    // The i18n mock returns keys; `operations.rowUnavailable` reads "This operation can't be displayed" in en.json.
    expect(screen.getByText(FALLBACK_KEY)).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      '[multisig-operations] operation row failed to render',
      { id: BROKEN_ID, chainId: broken.chainId, callHash: broken.callHash },
      expect.any(Error),
    );
  });

  it('retries rendering when the operation object changes', () => {
    const broken = createOperation(BROKEN_ID);
    const { rerender } = render(
      <OperationRowBoundary operation={broken}>
        <Row operation={broken} />
      </OperationRowBoundary>,
    );

    expect(screen.getByText(FALLBACK_KEY)).toBeInTheDocument();

    const fixed = createOperation('fixed');
    rerender(
      <OperationRowBoundary operation={fixed}>
        <Row operation={fixed} />
      </OperationRowBoundary>,
    );

    expect(screen.getByText('row fixed')).toBeInTheDocument();
    expect(screen.queryByText(FALLBACK_KEY)).not.toBeInTheDocument();
  });
});
