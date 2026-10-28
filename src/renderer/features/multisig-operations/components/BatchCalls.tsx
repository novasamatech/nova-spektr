import { type Chain, type DecodedTransaction, TransactionType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, formatSectionAndMethod, getAssetById, getNativeAsset, toAccountId } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { DetailRow, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/shared/ui-entities';
import {
  TransferTypes,
  XcmTypes,
  findCoreTransaction,
  getTransactionAmount,
  isTransferTransaction,
} from '@/entities/transaction';
import { NamedAccount } from '@/widgets/NameResolver';

const PROXY_MANAGEMENT_TYPES = new Set<TransactionType | undefined>([
  TransactionType.ADD_PROXY,
  TransactionType.REMOVE_PROXY,
  TransactionType.CREATE_PURE_PROXY,
  TransactionType.KILL_PURE_PROXY,
  TransactionType.PROXY,
]);

/** Nesting levels rendered, matching how deep the call lookup unwraps. */
const MAX_BATCH_DEPTH = 8;

const PROXY_TYPE_CALLS = new Set<TransactionType | undefined>([
  TransactionType.ADD_PROXY,
  TransactionType.REMOVE_PROXY,
  TransactionType.CREATE_PURE_PROXY,
  TransactionType.KILL_PURE_PROXY,
]);

const getCallAccountId = (call: DecodedTransaction): AccountId | null => {
  const address =
    (isTransferTransaction(call) && call.args?.dest) ||
    ((call.type === TransactionType.ADD_PROXY || call.type === TransactionType.REMOVE_PROXY) && call.args?.delegate) ||
    (call.type === TransactionType.DELEGATE && call.args?.target);

  return typeof address === 'string' ? toAccountId(address) : null;
};

const getCallProxyType = (call: DecodedTransaction): string | null => {
  const proxyType = PROXY_TYPE_CALLS.has(call.type) ? call.args?.proxyType : null;

  return typeof proxyType === 'string' ? proxyType : null;
};

const getCallAsset = (call: DecodedTransaction, chain: Chain) => {
  if (call.type && XcmTypes.includes(call.type)) {
    return null;
  }

  if (call.type && TransferTypes.includes(call.type) && call.args?.assetId) {
    return getAssetById(String(call.args.assetId), chain.assets) ?? null;
  }

  return getNativeAsset(chain.assets) ?? null;
};

const getBatchCalls = (call: DecodedTransaction): DecodedTransaction[] => {
  return call.type === TransactionType.BATCH_ALL ? (call.args?.transactions ?? []) : [];
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
        const nestedCalls = getBatchCalls(call);
        const accountId = getCallAccountId(call);
        const proxyType = getCallProxyType(call);
        const amount = nestedCalls.length > 0 ? null : getTransactionAmount(call);
        const asset = amount ? getCallAsset(call, chain) : null;

        return (
          <li key={index}>
            <DetailRow
              label={
                <FootnoteText
                  className={cnTw('text-text-tertiary', {
                    'text-text-warning': PROXY_MANAGEMENT_TYPES.has(call.type),
                  })}
                >
                  {number} {formatSectionAndMethod(call.section, call.method)}
                </FootnoteText>
              }
              className="text-text-secondary"
            >
              <div className="flex items-center gap-x-2">
                {amount && asset && <AssetBalance value={amount} asset={asset} className="text-text-secondary" />}
                {accountId && <NamedAccount chain={chain} accountId={accountId} variant="short" />}
                {proxyType && (
                  <FootnoteText className="text-text-tertiary">
                    {t('operation.details.batchCallProxyType', { proxyType })}
                  </FootnoteText>
                )}
              </div>
            </DetailRow>

            {nestedCalls.length > 0 && depth < MAX_BATCH_DEPTH && (
              <CallList calls={nestedCalls} chain={chain} prefix={number} depth={depth + 1} />
            )}
            {nestedCalls.length > 0 && depth >= MAX_BATCH_DEPTH && (
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
 * Lists every call of a batch operation, nested batches included, so the whole
 * batch is visible regardless of the operation title.
 */
export const BatchCalls = ({ transaction, chain }: Props) => {
  const { t } = useI18n();

  const batch = findCoreTransaction(transaction ?? null);

  if (batch?.type !== TransactionType.BATCH_ALL) {
    return null;
  }

  const calls = getBatchCalls(batch);

  if (calls.length === 0) {
    return null;
  }

  return (
    <>
      <hr className="border-filter-border" />

      <DetailRow label={t('operation.details.batchCalls')}>
        <FootnoteText className="text-text-secondary">{calls.length}</FootnoteText>
      </DetailRow>

      <CallList calls={calls} chain={chain} />
    </>
  );
};
