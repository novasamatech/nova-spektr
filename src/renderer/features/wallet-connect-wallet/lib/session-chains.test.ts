import { type SessionTypes } from '@walletconnect/types';
import { describe, expect, it } from 'vitest';

import { type ChainId } from '@/shared/core';

import { walletConnectService } from './service';

const WESTEND_AH = '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9' as ChainId;
const POLKADOT = '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId;

const session = (polkadot: { chains?: string[]; accounts?: string[] }) =>
  ({ namespaces: { polkadot: { methods: [], events: [], ...polkadot } } }) as unknown as SessionTypes.Struct;

describe('walletConnectService · session chains', () => {
  it('reads approved chains', () => {
    const s = session({ chains: ['polkadot:91b171bb158e2d3848fa23a9f1c25182'], accounts: [] });

    expect(walletConnectService.isChainInSession(s, POLKADOT)).toBe(true);
    expect(walletConnectService.isChainInSession(s, WESTEND_AH)).toBe(false);
  });

  it('falls back to the chains named by the accounts when `chains` is empty', () => {
    const s = session({ accounts: ['polkadot:67f9723393ef76214df0118c34bbbd3d:5Epsav'] });

    expect(walletConnectService.getSessionChains(s)).toEqual(['polkadot:67f9723393ef76214df0118c34bbbd3d']);
    expect(walletConnectService.isChainInSession(s, WESTEND_AH)).toBe(true);
  });

  it('is empty without a polkadot namespace', () => {
    const s = { namespaces: {} } as unknown as SessionTypes.Struct;

    expect(walletConnectService.getSessionChains(s)).toEqual([]);
    expect(walletConnectService.isChainInSession(s, POLKADOT)).toBe(false);
  });
});
