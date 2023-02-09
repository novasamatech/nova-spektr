import { ApiPromise } from '@polkadot/api';
import { u8aToHex, hexToU8a, BN } from '@polkadot/util';
import { Header } from '@polkadot/types/interfaces';
import { Codec } from '@polkadot/types/types';
import { Bytes, u32, Vec } from '@polkadot/types';

import { buildTrie } from './decode';
import { get } from './retreive';

async function getHeader(api: ApiPromise, chainId: number): Promise<any> {
  return api.query.paras.heads(chainId);
}

async function getParachainId(api: ApiPromise): Promise<number> {
  const parachainId = (await api.query.parachainInfo.parachainId()) as unknown as u32;

  return parachainId.toNumber();
}

async function getBlockHash(api: ApiPromise, header: Header): Promise<string> {
  const parachainBlockNumber = header.number;
  let blockNumber;

  try {
    if (!parachainBlockNumber.isEmpty) {
      blockNumber = parachainBlockNumber.unwrap();
    }
  } catch (error) {
    console.warn(error);
  }

  if (!blockNumber) return '';

  try {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);

    return blockHash.toHex();
  } catch (error) {
    console.warn(error);

    return '';
  }
}

const getProof = async (api: ApiPromise, storageKey: string, hash: string): Promise<Vec<Bytes> | undefined> => {
  try {
    const readProof = await api.rpc.state.getReadProof([storageKey], hash);

    return readProof.proof as unknown as Vec<Bytes>;
  } catch (error) {
    console.warn(error);

    return undefined;
  }
};

/**
 * Verify data from relay chain by proof and state root
 * Returns true if retrieved value is equal to value from relay chain
 * @param proof - proof from parachain
 * @param root - state root from relay chain
 * @param key - key to retrieve
 * @param value - value from relay chain
 * @return {Boolean}
 */
export const verify = (proof: Uint8Array[] | undefined, root: Uint8Array, key: string, value: Uint8Array): boolean => {
  if (!proof) return false;

  let proofValue;

  try {
    const rootNode = buildTrie(proof, root);
    proofValue = get(rootNode, hexToU8a(key));
  } catch (error) {
    console.warn(error);
  }

  if (!proofValue) {
    return value.every((byte) => byte === 0);
  }

  return u8aToHex(value) === u8aToHex(proofValue);
};

const validateWithBlockNumber = async (
  relaychainApi: ApiPromise,
  parachainApi: ApiPromise,
  blockNumber: BN,
  key: string,
  value: Uint8Array,
): Promise<boolean> => {
  const parachainId = await getParachainId(parachainApi);
  const header = await getHeader(relaychainApi, parachainId);

  const decodedHeader: Header = parachainApi.registry.createType('Header', header.toString()) as unknown as Header;

  if (decodedHeader.number.toBn().lte(blockNumber)) return false;

  const parachainStateRoot = decodedHeader.stateRoot;
  const parachainBlockHash = await getBlockHash(parachainApi, decodedHeader);

  const proof = await getProof(parachainApi, key, parachainBlockHash);

  return verify(proof, parachainStateRoot, key, value);
};

export const validate = async (
  relaychainApi: ApiPromise,
  parachainApi: ApiPromise,
  key: string,
  value: Codec,
): Promise<boolean> => {
  const blockHash = value.createdAtHash;
  const block = await parachainApi.rpc.chain.getBlock(blockHash);
  let blockNumber = new BN(0);

  if (!block.block.header.number.isEmpty) {
    blockNumber = block.block.header.number.unwrap().toBn();
  }

  return await validateWithBlockNumber(relaychainApi, parachainApi, blockNumber, key, value.toU8a());
};
