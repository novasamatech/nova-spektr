import { type dot, type dot_col, type dot_ppl, type ksm, type ksm_ppl } from '@polkadot-api/descriptors';
import { type ChainDefinition, type TypedApi } from 'polkadot-api';

type ChainsDescriptors = 'dot' | 'dot_ppl' | 'dot_col' | 'ksm' | 'ksm_ppl';
// type ChainsDescriptors =
//   | 'aca'
//   | 'air'
//   | 'ampe'
//   | 'astr'
//   | 'avail'
//   | 'azero'
//   | 'bnc'
//   | 'bsx'
//   | 'cfg'
//   | 'dot'
//   | 'dot_ppl'
//   | 'dot_col'
//   | 'glmr'
//   | 'hdx'
//   | 'imbu'
//   | 'kar'
//   | 'kilt'
//   | 'ksm'
//   | 'lit'
//   | 'movr'
//   | 'myth'
//   | 'pen'
//   | 'pha'
//   | 'plmc'
//   | 'qtz'
//   | 'sdn'
//   | 'teer'
//   | 'usdc'
//   | 'usdt'
//   | 'vara'
//   | 'wnd'
//   | 'ztg';

export type ChainApi<C extends ChainsDescriptors, A extends ChainDefinition> = {
  type: C;
  api: TypedApi<A>;
};

export type DotApi =
  | ChainApi<'dot', typeof dot>
  | ChainApi<'dot_ppl', typeof dot_ppl>
  | ChainApi<'dot_col', typeof dot_col>;

export type KsmApi = ChainApi<'ksm', typeof ksm> | ChainApi<'ksm_ppl', typeof ksm_ppl>;

export type PolkadotApi = DotApi | KsmApi;
