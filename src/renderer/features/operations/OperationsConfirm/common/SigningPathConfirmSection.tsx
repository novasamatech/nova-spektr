import { type ApiPromise } from '@polkadot/api';
import { useUnit } from 'effector-react';
import { type ReactNode } from 'react';

import { type Chain, type Transaction, type Wallet } from '@/shared/core';
import { TransactionDetails } from '@/shared/ui-entities';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { PathBreadcrumb, PathReviewPopover } from '@/features/signing-path';

import { CallDataConfirmSection } from './CallDataConfirmSection';

type Props = {
  signingPath: PathNode[] | undefined;
  chain: Chain;
  wallets: Wallet[];
  initiators: AnyAccount[];
  signatory: AnyAccount;
  children: ReactNode;
  api?: ApiPromise;
  resultTx?: Transaction;
  coreTx?: Transaction | null;
};

export const SigningPathConfirmSection = ({
  signingPath,
  chain,
  wallets,
  initiators,
  signatory,
  children,
  api,
  resultTx,
  coreTx,
}: Props) => {
  const apis = useUnit(networkModel.$apis);
  const resolvedApi = api ?? apis?.[chain.chainId] ?? null;
  const callDataSection =
    resolvedApi && resultTx ? (
      <CallDataConfirmSection api={resolvedApi} chain={chain} resultTx={resultTx} coreTx={coreTx} />
    ) : null;

  if (signingPath && signingPath.length >= 2) {
    return (
      <div className="flex w-full flex-col gap-y-4">
        <div className="flex w-full justify-start">
          <PathReviewPopover path={signingPath} chainId={chain.chainId} />
        </div>
        <PathBreadcrumb path={signingPath} chainId={chain.chainId} size="sm" orientation="auto" />
        <hr className="w-full border-filter-border pr-2" />
        <dl className="flex w-full flex-col gap-y-4 text-footnote">
          {children}
          {callDataSection}
        </dl>
      </div>
    );
  }

  return (
    <TransactionDetails chain={chain} wallets={wallets} initiators={initiators} signatory={signatory}>
      {children}
      {callDataSection}
    </TransactionDetails>
  );
};
