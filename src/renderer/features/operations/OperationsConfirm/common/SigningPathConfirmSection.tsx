import { type ReactNode } from 'react';

import { type Chain, type Wallet } from '@/shared/core';
import { TransactionDetails } from '@/shared/ui-entities';
import { type PathNode } from '@/domains/backend';
import { type AnyAccount } from '@/domains/network';
import { PathBreadcrumb, PathReviewPopover } from '@/features/signing-path';

type Props = {
  signingPath: PathNode[] | undefined;
  chain: Chain;
  wallets: Wallet[];
  initiators: AnyAccount[];
  signatory: AnyAccount;
  children: ReactNode;
};

export const SigningPathConfirmSection = ({ signingPath, chain, wallets, initiators, signatory, children }: Props) => {
  if (signingPath && signingPath.length >= 2) {
    return (
      <div className="flex w-full flex-col gap-y-4">
        <div className="flex w-full justify-start">
          <PathReviewPopover path={signingPath} chainId={chain.chainId} />
        </div>
        <PathBreadcrumb path={signingPath} chainId={chain.chainId} size="sm" />
        <hr className="w-full border-filter-border pr-2" />
        <dl className="flex w-full flex-col gap-y-4 text-footnote">{children}</dl>
      </div>
    );
  }

  return (
    <TransactionDetails chain={chain} wallets={wallets} initiators={initiators} signatory={signatory}>
      {children}
    </TransactionDetails>
  );
};
