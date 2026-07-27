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
 * Draft mode wins — the user explicitly chose to hand the operation to someone
 * else. Watch-only is the defensive floor: such a wallet can sign nothing, so
 * the screen must never offer to continue even if a host flow lets one
 * through.
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
