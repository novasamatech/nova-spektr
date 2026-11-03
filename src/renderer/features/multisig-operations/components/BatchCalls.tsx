import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatSectionAndMethod, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import { XcmTypes, findCoreTransaction, getTransactionAmount, isTransferTransaction } from '@/entities/transaction';
import { NamedAccount } from '@/widgets/NameResolver';
import { resolveTransactionAsset } from '../lib/transfer-amount-extractor';

/** Calls that change proxies: highlighted, and shown with their access type. */
const PROXY_MANAGEMENT_CALLS = new Set<TransactionType | undefined>([
  TransactionType.ADD_PROXY,
  TransactionType.REMOVE_PROXY,
  TransactionType.CREATE_PURE_PROXY,
  TransactionType.KILL_PURE_PROXY,
]);

/**
 * How many levels of nested calls (batches and proxy wrappers) are rendered.
 * Deeper calls collapse into one "N more nested calls" line. A render cap only,
 * unrelated to how far the domain unwraps wrapper calls on decode.
 */
const MAX_NESTED_CALL_DEPTH = 8;

const getCallAccountId = (call: DecodedTransaction): AccountId | null => {
  const address =
    (isTransferTransaction(call) && call.args?.dest) ||
    ((call.type === TransactionType.ADD_PROXY || call.type === TransactionType.REMOVE_PROXY) && call.args?.delegate) ||
    (call.type === TransactionType.DELEGATE && call.args?.target) ||
    (call.type === TransactionType.PROXY && call.args?.real);

  return typeof address === 'string' ? toAccountId(address) : null;
};

const getCallProxyType = (call: DecodedTransaction): string | null => {
  const proxyType = PROXY_MANAGEMENT_CALLS.has(call.type) ? call.args?.proxyType : null;

  return typeof proxyType === 'string' ? proxyType : null;
};

// XCM amounts are not in a chain asset the recap can resolve, so they are left out.
const getCallAsset = (call: DecodedTransaction, chain: Chain) => {
  return call.type && XcmTypes.includes(call.type) ? null : resolveTransactionAsset(call, chain);
};

/**
 * Calls nested in a call: the calls of a batch, or the call a proxy wrapper
 * dispatches.
 */
const getNestedCalls = (call: DecodedTransaction): DecodedTransaction[] => {
  if (call.type === TransactionType.BATCH_ALL) {
    return call.args?.transactions ?? [];
  }

  if (call.type === TransactionType.PROXY && call.args?.transaction) {
    return [call.args.transaction];
  }

  return [];
};

type CallListProps = {
  calls: DecodedTransaction[];
  chain: Chain;
  prefix?: string;
  depth?: number;
};

const CallList = ({ calls, chain, prefix = '', depth = 1 }: CallListProps) => {
  const { t } = useI18n();

  return (
    <ol
      className={cnTw('flex flex-col gap-y-2', { 'mt-2 pl-4': prefix })}
      data-testid={prefix ? undefined : 'batch-calls'}
    >
      {calls.map((call, index) => {
        const number = `${prefix}${index + 1}.`;
        const nestedCalls = getNestedCalls(call);
        const accountId = getCallAccountId(call);
        const proxyType = getCallProxyType(call);
        // Only leaf calls carry an amount — a wrapper row would repeat its inner call's amount.
        const amount = nestedCalls.length > 0 ? null : getTransactionAmount(call);
        const asset = amount ? getCallAsset(call, chain) : null;

        return (
          <li key={number}>
            <div className="flex min-h-6 w-full items-center justify-between gap-2">
              <FootnoteText
                className={cnTw('text-text-tertiary', {
                  'text-text-warning': PROXY_MANAGEMENT_CALLS.has(call.type),
                })}
              >
                {number} {formatSectionAndMethod(call.section, call.method)}
              </FootnoteText>

              <div className="flex items-center gap-x-2 text-text-secondary">
                {amount && asset && <AssetBalance value={amount} asset={asset} className="text-text-secondary" />}
                {accountId && <NamedAccount chain={chain} accountId={accountId} variant="short" />}
                {proxyType && (
                  <FootnoteText className="text-text-tertiary">
                    {t('operation.details.batchCallProxyType', { proxyType })}
                  </FootnoteText>
                )}
              </div>
            </div>

            {nestedCalls.length > 0 && depth < MAX_NESTED_CALL_DEPTH && (
              <CallList calls={nestedCalls} chain={chain} prefix={number} depth={depth + 1} />
            )}
            {nestedCalls.length > 0 && depth >= MAX_NESTED_CALL_DEPTH && (
              <FootnoteText className="mt-2 block pl-4 text-text-tertiary">
                {t('operation.details.batchCallsHidden', { count: nestedCalls.length })}
              </FootnoteText>
            )}
          </li>
        );
      })}
    </ol>
  );
};

type Props = {
  transaction?: DecodedTransaction | null;
  chain: Chain;
};

/**
 * Lists every call of a batch operation, nested batches and proxy wrappers
 * included, so the whole batch is visible regardless of the operation title.
 * Rendered as one `dt`/`dd` group, so it sits inside the details `<dl>`.
 */
export const BatchCalls = ({ transaction, chain }: Props) => {
  const { t } = useI18n();

  const batch = findCoreTransaction(transaction ?? null);

  if (batch?.type !== TransactionType.BATCH_ALL) {
    return null;
  }

  const calls = getNestedCalls(batch);

  if (calls.length === 0) {
    return null;
  }

  return (
    <>
      <hr className="border-filter-border" />

      <div className="flex w-full flex-col gap-y-2">
        <dt className="flex min-h-6 items-center justify-between gap-2">
          <FootnoteText className="text-text-tertiary">{t('operation.details.batchCalls')}</FootnoteText>
          <FootnoteText className="text-text-secondary">{calls.length}</FootnoteText>
        </dt>
        <dd>
          <CallList calls={calls} chain={chain} />
        </dd>
      </div>
    </>
  );
};
