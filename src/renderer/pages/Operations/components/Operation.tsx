import { chainsService } from '@/shared/api/network';
import { type FlexibleMultisigTransactionDS, type MultisigTransactionDS } from '@/shared/api/storage';
import { type FlexibleMultisigAccount, type MultisigAccount } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { getAssetById } from '@/shared/lib/utils';
import { Accordion, FootnoteText } from '@/shared/ui';
import { AssetBalance } from '@/entities/asset';
import { ChainTitle, XcmChains } from '@/entities/chain';
import { useMultisigEvent } from '@/entities/multisig';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@/entities/transaction';

import { OperationFullInfo } from './OperationFullInfo';
import { Status } from './Status';

type Props = {
  tx: MultisigTransactionDS | FlexibleMultisigTransactionDS;
  account: MultisigAccount | FlexibleMultisigAccount | null;
};

const Operation = ({ tx, account }: Props) => {
  const { formatDate } = useI18n();
  const { getLiveEventsByKeys } = useMultisigEvent({});

  const events = getLiveEventsByKeys([tx]);
  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
  const initEvent = approvals.find((e) => e.accountId === tx.depositor);
  const date = new Date(tx.dateCreated || initEvent?.dateCreated || Date.now());
  const assetId = tx.transaction && (tx.transaction.args.assetId || tx.transaction.args.asset);
  const asset = getAssetById(assetId, chainsService.getChainById(tx.chainId)?.assets);
  const amount = tx.transaction && getTransactionAmount(tx.transaction);

  return (
    <Accordion className="rounded bg-block-background-default transition-shadow hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="flex h-[52px] w-full items-center gap-x-4 overflow-hidden">
          <div className="w-[58px] pr-1">
            <FootnoteText className="text-text-tertiary" align="right">
              {formatDate(date, 'p')}
            </FootnoteText>
          </div>

          <TransactionTitle className="flex-1 overflow-hidden" tx={tx.transaction} />

          {asset && amount && (
            <div className="w-[160px]">
              <AssetBalance value={amount} asset={asset} showIcon />
            </div>
          )}

          {isXcmTransaction(tx.transaction) ? (
            <XcmChains
              chainIdFrom={tx.chainId}
              chainIdTo={tx.transaction?.args.destinationChain}
              className="w-[114px]"
            />
          ) : (
            <ChainTitle chainId={tx.chainId} className="w-[114px]" />
          )}

          <div className="flex w-[120px] justify-end">
            <Status status={tx.status} signed={approvals.length} threshold={account?.threshold || 0} />
          </div>
        </div>
      </Accordion.Button>
      <Accordion.Content className="border-t border-divider">
        <OperationFullInfo tx={tx} account={account} />
      </Accordion.Content>
    </Accordion>
  );
};

export default Operation;
