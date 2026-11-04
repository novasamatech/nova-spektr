import { type ApiPromise } from '@polkadot/api';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { polkadotAssetHubChain } from '@/shared/mocks';
import { type CallArgDef } from '../../lib/types';
import { useExtrinsicBuilder } from '../useExtrinsicBuilder';

const balance = (name: string): CallArgDef => ({ name, typeDef: { kind: 'balance', typeName: 'T::Balance' } });

// assets.transfer(id, target, amount): the amount's unit follows the asset id
const ASSETS_TRANSFER_ARGS: CallArgDef[] = [
  { name: 'id', typeDef: { kind: 'compact', typeName: 'Compact<u32>', inner: { kind: 'primitive', typeName: 'u32' } } },
  { name: 'target', typeDef: { kind: 'accountId', typeName: 'MultiAddress' } },
  balance('amount'),
];

const parseCallData = vi.fn();

vi.mock('../../lib/extrinsicBuilder', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getPalletNames: () => ['assets'],
  getCallNames: () => ['transfer'],
  getCallMeta: () => ({ args: ASSETS_TRANSFER_ARGS, docs: [] }),
  encodeCallData: () => '0x00',
  parseCallData: (...args: unknown[]) => parseCallData(...args),
}));

const api = {} as unknown as ApiPromise;

const USDT = { precision: 6, symbol: 'USDT' };

function renderBuilder(initialCallData?: string) {
  const hook = renderHook(() => useExtrinsicBuilder({ api, chain: polkadotAssetHubChain, initialCallData }));

  return {
    ...hook,
    set: (name: string, value: unknown) => act(() => hook.result.current.handleParamChange(name, value)),
  };
}

function renderAssetsTransfer() {
  const builder = renderBuilder();
  act(() => builder.result.current.handlePalletChange('assets'));
  act(() => builder.result.current.handleCallChange('transfer'));

  return builder;
}

describe('useExtrinsicBuilder', () => {
  it('clears an amount typed in base units once the asset id gives it a unit', () => {
    const { result, set } = renderAssetsTransfer();

    set('amount', '1500000');
    expect(result.current.amountUnit).toBeNull();

    set('id', '1984');

    expect(result.current.amountUnit).toEqual(USDT);
    expect(result.current.paramValues).toEqual({ id: '1984' });
  });

  it('clears an amount when the asset id switches to another asset', () => {
    const { result, set } = renderAssetsTransfer();

    set('id', '1984');
    set('amount', '1.5');
    set('id', '1337');

    expect(result.current.amountUnit).toEqual({ precision: 6, symbol: 'USDC' });
    expect(result.current.paramValues).toEqual({ id: '1337' });
  });

  it('keeps the amount while the unit stays the same', () => {
    const { result, set } = renderAssetsTransfer();

    set('id', '1984');
    set('amount', '1.5');
    set('target', 'alice');

    expect(result.current.paramValues).toEqual({ id: '1984', amount: '1.5', target: 'alice' });
  });

  it('keeps an amount while an unknown asset id is being typed', () => {
    const { result, set } = renderAssetsTransfer();

    set('amount', '1500000');
    set('id', '19');

    expect(result.current.amountUnit).toBeNull();
    expect(result.current.paramValues).toEqual({ id: '19', amount: '1500000' });
  });

  it('keeps the amounts of a call restored from hex together with its asset id', () => {
    parseCallData.mockReturnValue({
      pallet: 'assets',
      call: 'transfer',
      args: { id: '1984', target: 'alice', amount: '1.5' },
    });

    const { result } = renderBuilder('0xabcd');

    expect(result.current.amountUnit).toEqual(USDT);
    expect(result.current.paramValues).toEqual({ id: '1984', target: 'alice', amount: '1.5' });
  });
});
