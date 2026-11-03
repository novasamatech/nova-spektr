import { type PropsWithChildren } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useI18n } from '@/shared/i18n';
import { FootnoteText } from '@/shared/ui';
import { type MultisigOperation } from '@/domains/network';
import { ROW_HEIGHT } from '@/aggregates/operations-table-layout';

type Props = PropsWithChildren<{
  operation: MultisigOperation;
}>;

/**
 * Isolates one operation row from the rest of the list: a row that throws while
 * rendering (malformed call data, an operation shape the parsers do not expect)
 * is replaced by a row-sized placeholder instead of propagating to the app-wide
 * boundary and replacing the whole screen.
 *
 * The boundary latches on the first throw and clears only on a changed
 * `resetKeys` — keyed on the operation object, so a refreshed operation (new
 * approvals, resolved call data) gets another attempt to render.
 */
export const OperationRowBoundary = ({ operation, children }: Props) => {
  return (
    <ErrorBoundary
      resetKeys={[operation]}
      fallback={<OperationRowFallback />}
      onError={error => {
        console.error(
          '[multisig-operations] operation row failed to render',
          { id: operation.id, chainId: operation.chainId, callHash: operation.callHash },
          error,
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

/** Same height as a collapsed row so the virtualizer's measurement stays stable. */
const OperationRowFallback = () => {
  const { t } = useI18n();

  return (
    <div
      className="flex items-center justify-center rounded bg-block-background-default px-4"
      style={{ height: ROW_HEIGHT }}
    >
      <FootnoteText className="text-text-tertiary">{t('operations.rowUnavailable')}</FootnoteText>
    </div>
  );
};
