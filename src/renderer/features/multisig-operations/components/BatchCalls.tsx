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

const getCallAccountId = (call: DecodedTransaction): AccountId | null => {
  const address =
    (isTransferTransaction(call) && call.args?.dest) ||
    ((call.type === TransactionType.ADD_PROXY || call.type === TransactionType.REMOVE_PROXY) && call.args?.delegate) ||
    (call.type === TransactionType.DELEGATE && call.args?.target);

  return typeof address === 'string' ? toAccountId(address) : null;
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

type Props = {
  transaction?: DecodedTransaction | null;
  chain: Chain;
};

/**
 * Lists every call of a batch operation, so the whole batch is visible
 * regardless of the operation title.
 */
export const BatchCalls = ({ transaction, chain }: Props) => {
  const { t } = useI18n();

  const batch = findCoreTransaction(transaction ?? null);

  if (batch?.type !== TransactionType.BATCH_ALL) {
    return null;
  }

  const calls: DecodedTransaction[] = batch.args?.transactions ?? [];

  if (calls.length === 0) {
    return null;
  }

  return (
    <>
      <hr className="border-filter-border" />

      <DetailRow label={t('operation.details.batchCalls')}>
        <FootnoteText className="text-text-secondary">{calls.length}</FootnoteText>
      </DetailRow>

      <ol className="flex flex-col gap-y-2" data-testid="batch-calls">
        {calls.map((call, index) => {
          const accountId = getCallAccountId(call);
          const amount = getTransactionAmount(call);
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
                    {index + 1}. {formatSectionAndMethod(call.section, call.method)}
                  </FootnoteText>
                }
                className="text-text-secondary"
              >
                <div className="flex items-center gap-x-2">
                  {amount && asset && <AssetBalance value={amount} asset={asset} className="text-text-secondary" />}
                  {accountId && <NamedAccount chain={chain} accountId={accountId} variant="short" />}
                </div>
              </DetailRow>
            </li>
          );
        })}
      </ol>
    </>
  );
};
