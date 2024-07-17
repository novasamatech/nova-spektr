import { useI18n } from '@app/providers';
import { Accordion, FootnoteText } from '@shared/ui';
import { Status } from './Status';
import { OperationFullInfo } from './OperationFullInfo';
import { type MultisigTransactionDS } from '@shared/api/storage';
import { useMultisigEvent } from '@entities/multisig';
import { ChainTitle, XcmChains } from '@entities/chain';
import { TransactionTitle, getTransactionAmount, isXcmTransaction } from '@entities/transaction';
import type { MultisigAccount } from '@shared/core';
import { chainsService } from '@shared/api/network';
import { getAssetById } from '@shared/lib/utils';
import { AssetBalance } from '@entities/asset';

type Props = {
  tx: MultisigTransactionDS;
  account?: MultisigAccount;
};

const Operation = ({ tx, account }: Props) => {
  const { formatDate } = useI18n();
  const { getLiveEventsByKeys } = useMultisigEvent({});

  const events = getLiveEventsByKeys([tx]);
  const approvals = events?.filter((e) => e.status === 'SIGNED') || [];
  const initEvent = approvals.find((e) => e.accountId === tx.depositor);
  const date = new Date(tx.dateCreated || initEvent?.dateCreated || Date.now());
  const asset =
    tx.transaction && getAssetById(tx.transaction.args.asset, chainsService.getChainById(tx.chainId)?.assets);
  const amount = tx.transaction && getTransactionAmount(tx.transaction);

  return (
    <Accordion className="bg-block-background-default transition-shadow rounded hover:shadow-card-shadow focus-visible:shadow-card-shadow">
      <Accordion.Button buttonClass="px-2" iconWrapper="px-1.5">
        <div className="h-[52px] flex gap-x-4 items-center w-full overflow-hidden">
          <div className="w-[58px] pr-1">
            <FootnoteText className="text-text-tertiary" align="right">
              {formatDate(date, 'p')}
            </FootnoteText>
          </div>

          <TransactionTitle className="flex-1 overflow-hidden" tx={tx.transaction} description={tx.description} />

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

          <div className="flex justify-end w-[120px]">
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
