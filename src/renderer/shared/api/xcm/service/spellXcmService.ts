import { Builder, Native, convertSs58, getSupportedDestinations } from '@paraspell/sdk-pjs';
import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN } from '@polkadot/util';

import { type Asset, AssetType, type Chain } from '@/shared/core';
import { CHAIN_ID_TO_SPELL_NAME_MAP, formatAmount, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type XcmTransferParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi?: ApiPromise;
  toChainApi?: ApiPromise;
};

type XcmFeeParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi?: ApiPromise;
  toChainApi?: ApiPromise;
};

type XcmFeeResult = {
  originFee: BN;
  destinationFee: BN | null;
};

type XcmTransferResult = {
  extrinsic: SubmittableExtrinsic<'promise'>;
  disconnect: () => Promise<void>;
};

type BuilderResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any;
  fromChainName: string;
  toChainName: string;
};

function getSpellChainName(chain: Chain): string | null {
  return CHAIN_ID_TO_SPELL_NAME_MAP[chain.chainId] ?? null;
}

function convertAddressToChainFormat(accountId: AccountId, targetChain: Chain, targetChainName: string): string {
  try {
    const address = toAddress(accountId, { prefix: targetChain.addressPrefix });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return convertSs58(address, targetChainName as any);
  } catch {
    return accountId.toString();
  }
}

function createCurrencyInput(
  asset: Asset,
  amount: string,
): { amount: string; symbol: string | ReturnType<typeof Native> } {
  const amountBN = new BN(formatAmount(amount, asset.precision));
  const isNativeAsset = asset.type === AssetType.NATIVE;

  return {
    amount: amountBN.toString(),
    symbol: isNativeAsset ? Native(asset.symbol) : asset.symbol,
  };
}

function createBuilderConfig(
  fromChain: Chain,
  toChain: Chain,
  fromChainApi?: ApiPromise,
  toChainApi?: ApiPromise,
): { abstractDecimals: boolean; apiOverrides?: Record<string, string[] | ApiPromise> } {
  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName || !toChainName) {
    return { abstractDecimals: false };
  }

  const apiOverrides: Record<string, string[] | ApiPromise> = {};

  if (fromChainApi) {
    apiOverrides[fromChainName] = fromChainApi;
  } else {
    const fromChainWsUrls = fromChain.nodes.map((node) => node.url);
    if (fromChainWsUrls.length > 0) {
      apiOverrides[fromChainName] = fromChainWsUrls;
    }
  }

  if (toChainApi) {
    apiOverrides[toChainName] = toChainApi;
  } else {
    const toChainWsUrls = toChain.nodes.map((node) => node.url);
    if (toChainWsUrls.length > 0) {
      apiOverrides[toChainName] = toChainWsUrls;
    }
  }

  return {
    abstractDecimals: false,
    ...(Object.keys(apiOverrides).length > 0 && { apiOverrides }),
  };
}

function buildXcmTransferBuilder(params: XcmTransferParams): BuilderResult | null {
  const { fromChain, toChain, asset, amount, destinationAddress, senderAddress, fromChainApi, toChainApi } = params;

  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName || !toChainName) {
    return null;
  }

  const builderConfig = createBuilderConfig(fromChain, toChain, fromChainApi, toChainApi);
  const currencyInput = createCurrencyInput(asset, amount);

  // console.log('builderConfig', fromChainApi, toChainApi);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let builder: any = Builder(builderConfig)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(fromChainName as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .to(toChainName as any)
    .currency(currencyInput)
    .address(destinationAddress);

  if (senderAddress) {
    builder = builder.senderAddress(senderAddress);
  }

  return {
    builder,
    fromChainName,
    toChainName,
  };
}

async function getXcmFees(params: XcmFeeParams, abortSignal?: AbortSignal): Promise<XcmFeeResult | null> {
  if (abortSignal?.aborted) {
    return null;
  }

  const builderResult = buildXcmTransferBuilder(params);

  if (!builderResult) {
    return null;
  }

  const { builder } = builderResult;

  try {
    if (abortSignal?.aborted) {
      await builder.disconnect().catch(() => {});
      return null;
    }

    const feeResult = await builder.getXcmFee({ disableFallback: false });

    if (abortSignal?.aborted) {
      await builder.disconnect().catch(() => {});
      return null;
    }

    const originFee = new BN(String(feeResult.origin.fee));
    const destinationFee = feeResult.destination?.fee ? new BN(String(feeResult.destination.fee)) : null;

    await builder.disconnect().catch(() => {});

    return {
      originFee,
      destinationFee,
    };
  } catch {
    await builder.disconnect().catch(() => {});
    return null;
  }
}

async function buildTransfer(params: XcmTransferParams): Promise<XcmTransferResult> {
  const builderResult = buildXcmTransferBuilder(params);

  if (!builderResult) {
    const { fromChain, toChain } = params;
    throw new Error(
      `Unsupported chain: ${fromChain.name} (chainId: ${fromChain.chainId}) or ${toChain.name} (chainId: ${toChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  const { builder, fromChainName, toChainName } = builderResult;

  try {
    const extrinsic = await builder.build();

    const methodName = extrinsic.method.method.toLowerCase();
    const section = extrinsic.method.section.toLowerCase();

    if (
      (section === 'balances' || section === 'tokens') &&
      (methodName === 'transfer' || methodName === 'transferkeepalive' || methodName === 'transferall')
    ) {
      await builder.disconnect().catch(() => {});
      throw new Error(
        `XCM transfer not supported for ${fromChainName} -> ${toChainName}. Regular transfer was generated instead. This indicates the ParaSpell SDK does not support this route.`,
      );
    }

    return {
      extrinsic,
      disconnect: async () => {
        await builder.disconnect().catch(() => {});
      },
    };
  } catch (error) {
    await builder.disconnect().catch(() => {});
    throw error;
  }
}

async function getAvailableTransfers(fromChain: Chain, asset: Asset): Promise<string[]> {
  const fromChainName = getSpellChainName(fromChain);
  if (!fromChainName) {
    return [];
  }

  try {
    const currencyInput = createCurrencyInput(asset, '0');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return getSupportedDestinations(fromChainName as any, currencyInput);
  } catch {
    return [];
  }
}

function prepareAddressForChain(accountId: AccountId, chain: Chain, chainName: string): string {
  return convertAddressToChainFormat(accountId, chain, chainName);
}

export const spellXcmService = {
  buildTransfer,
  getXcmFees,
  getAvailableTransfers,
  getSpellChainName,
  prepareAddressForChain,
};
