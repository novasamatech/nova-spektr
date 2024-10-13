import { KeyType } from '@/shared/core';
import { type TypedImportedDerivation } from '../../lib/types';

// TODO removed when all derivations features merged and tested
export const EXISTING_DERIVATIONS: TypedImportedDerivation[] = [
  {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: KeyType.MAIN,
    derivationPath: '//polkadot',
  },
  {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: KeyType.GOVERNANCE,
    derivationPath: '//polkadot//gov',
  },
  {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    type: KeyType.PUBLIC,
    derivationPath: '//polkadot//staking//some_key',
  },
  {
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    type: KeyType.PUBLIC,
    derivationPath: '//kusama//pub',
  },
];

export const ROOT_ACCOUNT_ID = '0x387aed21a43ed189c8f0d14aab6f05f715f1adfe670efa6090208ddd4efe991f';
