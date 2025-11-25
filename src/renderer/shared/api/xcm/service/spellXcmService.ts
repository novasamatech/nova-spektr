import { Builder, Native, getSupportedDestinations } from '@paraspell/sdk-pjs';
import { type ApiPromise } from '@polkadot/api';
import { type SubmittableExtrinsic } from '@polkadot/api/types';
import { BN } from '@polkadot/util';

import { type Asset, AssetType, type Chain } from '@/shared/core';
import { CHAIN_ID_TO_SPELL_NAME_MAP, formatAmount, isEthereumAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type XcmTransferParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi: ApiPromise;
  toChainApi: ApiPromise;
};

type XcmFeeParams = {
  fromChain: Chain;
  toChain: Chain;
  asset: Asset;
  amount: string;
  destinationAddress: string;
  senderAddress?: string;
  fromChainApi: ApiPromise;
  toChainApi: ApiPromise;
};

type XcmFeeResult = {
  originFee: BN;
  destinationFee: BN | null;
};

type XcmTransferResult = {
  extrinsic: SubmittableExtrinsic<'promise'>;
};

type BuilderResult = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any;
  fromChainName: string;
  toChainName: string;
};

type BuilderConfig = {
  abstractDecimals: boolean;
  apiOverrides: Record<string, ApiPromise>;
};

function getSpellChainName(chain: Chain): string | null {
  return CHAIN_ID_TO_SPELL_NAME_MAP[chain.chainId] ?? null;
}

function convertAddressToChainFormat(accountId: AccountId, targetChain: Chain, _targetChainName: string): string {
  if (isEthereumAccountId(accountId)) {
    return accountId.toString();
  }

  return toAddress(accountId, { prefix: targetChain.addressPrefix });
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
  fromChainApi: ApiPromise,
  toChainApi: ApiPromise,
): BuilderConfig {
  const fromChainName = getSpellChainName(fromChain);
  const toChainName = getSpellChainName(toChain);

  if (!fromChainName) {
    throw new Error(
      `spellXcmService: Unsupported origin chain: ${fromChain.name} (chainId: ${fromChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  if (!toChainName) {
    throw new Error(
      `spellXcmService: Unsupported destination chain: ${toChain.name} (chainId: ${toChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  return {
    abstractDecimals: false,
    apiOverrides: {
      [fromChainName]: fromChainApi,
      [toChainName]: toChainApi,
    },
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
      return null;
    }

    const feeResult = await builder.getXcmFee({ disableFallback: false });

    if (abortSignal?.aborted) {
      return null;
    }

    const originFee = new BN(String(feeResult.origin.fee));
    const destinationFee = feeResult.destination?.fee ? new BN(String(feeResult.destination.fee)) : null;

    return {
      originFee,
      destinationFee,
    };
  } catch {
    return null;
  }
}

async function buildTransfer(params: XcmTransferParams): Promise<XcmTransferResult> {
  const builderResult = buildXcmTransferBuilder(params);

  if (!builderResult) {
    const { fromChain, toChain } = params;
    throw new Error(
      `spellXcmService: buildTransfer failed for chains: ${fromChain.name}, ${toChain.name} (chainId: ${fromChain.chainId}) -> ${toChain.chainId}). Please add mapping in CHAIN_ID_TO_SPELL_NAME_MAP.`,
    );
  }

  const { builder } = builderResult;

  const extrinsic = await builder.build();

  return {
    extrinsic,
  };
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
  createBuilderConfig,
  buildXcmTransferBuilder,
};
