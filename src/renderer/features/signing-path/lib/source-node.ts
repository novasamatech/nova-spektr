import { type PathNode } from '@/domains/backend';
import { type PathSource } from '../model/graph-model';

/**
 * The node a picked source opens the path with. The kind comes from the graph,
 * never from the caller: a flexible multisig enters as `proxied`, a plain
 * multisig as `multisig`, and a key of ours as `signer` — which is also where
 * such a path ends.
 */
export const sourceToNode = (source: Pick<PathSource, 'accountId' | 'kind'>): PathNode => ({
  kind: source.kind,
  accountId: source.accountId,
});
