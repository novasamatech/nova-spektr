import { type dot, type dot_col, type dot_ppl } from '@polkadot-api/descriptors';
import { type ChainDefinition, type TypedApi } from 'polkadot-api';

type ChainsDescriptors = 'dot' | 'dot_ppl' | 'dot_col';
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

export type GroupApi<C extends ChainsDescriptors, A extends ChainDefinition> = {
  type: C;
  api: TypedApi<A>;
};

export type ChainApi =
  | GroupApi<'dot', typeof dot>
  | GroupApi<'dot_ppl', typeof dot_ppl>
  | GroupApi<'dot_col', typeof dot_col>;
