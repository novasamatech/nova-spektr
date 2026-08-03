import { type ChainId, type Wallet, WalletType } from '@/shared/core';
import { nullable } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

import { type SigningInfo, type SigningMode } from './types';

type SigningModeParams = {
  isDraftMode: boolean;
  wallet?: Wallet | null;
};

/**
 * Which of the three shapes the picker takes for the **initiator's wallet**.
 *
 * Deliberately **not** the "can this account sign?" rule the signing-path graph
 * terminates at (`signingType !== WATCH_ONLY`). That one asks whether _this
 * account_ can put a signature on an extrinsic itself; this asks whether the
 * operation has any way of leaving the screen at all, and the two disagree
 * exactly where delegation is involved. A proxied account carries
 * `SigningType.WATCH_ONLY` and a multisig account cannot sign alone, yet both
 * open a perfectly ordinary picker — the graph walks from them to a real key.
 * Narrowing this to the signer rule would lock those wallets into a read-only
 * table.
 *
 * What it does exclude is the watch-only _wallet_: nothing in it delegates
 * anywhere, so no path exists from any of its accounts, and the picker is a
 * read-only view of the nominations the address already has. It stays here as a
 * defensive floor in case a host flow lets such a wallet through.
 *
 * Draft mode wins over both — the user explicitly chose to hand the operation
 * to someone else, whatever their own wallet could have done with it.
 */
export function getSigningMode({ isDraftMode, wallet }: SigningModeParams): SigningMode {
  if (isDraftMode) return 'draft';
  if (wallet?.type === WalletType.WATCH_ONLY) return 'watchOnly';

  return 'local';
}

/** Shape of one `graphModel.$multisigByAccountId` entry. */
type MultisigInfo = {
  signatories: AccountId[];
  threshold: number;
};

type Params = {
  /** The signing path the host flow committed for the draft. */
  path: PathNode[];
  chainId: ChainId;
  /** `graphModel.$multisigByAccountId` — multisig metadata keyed by account id. */
  multisigByAccountId: Map<AccountId, MultisigInfo>;
  /** `graphModel.$nameResolver` — the same name the signing-path UI shows. */
  resolveName: (accountId: AccountId, chainId: ChainId) => string;
};

/**
 * Describes who will sign the draft, read from the path the host flow already
 * committed. `undefined` while that path has no signer yet — a header that
 * named a signer the user has not chosen would be worse than a silent one, and
 * every field stays absent rather than guessed when the path says nothing about
 * it.
 */
export function getDraftSigningInfo({
  path,
  chainId,
  multisigByAccountId,
  resolveName,
}: Params): SigningInfo | undefined {
  const signer = path.at(-1);
  if (nullable(signer) || signer.kind !== 'signer') return undefined;

  const multisigNode = path.find((node) => node.kind === 'multisig');
  const multisig = nullable(multisigNode) ? undefined : multisigByAccountId.get(multisigNode.accountId);

  return {
    signerName: resolveName(signer.accountId, chainId),
    multisigLabel: nullable(multisig) ? undefined : `${multisig.threshold}/${multisig.signatories.length}`,
    signatoriesCount: multisig?.signatories.length,
  };
}
