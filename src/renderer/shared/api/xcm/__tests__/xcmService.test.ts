import { XCM_KEY } from '../lib/constants';
import {
  estimateFeeFromConfig,
  getXcmConfig,
  getDestinationLocation,
  parseXTokensExtrinsic,
  parseXcmPalletExtrinsic,
} from '../xcmService';
import {
  CONFIG,
  XTOKENS_ACA_PARALLEL,
  XTOKENS_ACA_DOT,
  XCMPALLET_TRANSFER_KSM_BIFROST,
  XCMPALLET_TRANSFER_HUB_ASTAR,
} from './mock/xcmData';

describe('shared/api/xcm/xcmService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should get empty config from localStorage', () => {
    const config = getXcmConfig();
    expect(config).toEqual(null);
  });

  test('should get not empty config from localStorage', () => {
    localStorage.setItem(XCM_KEY, JSON.stringify(CONFIG));

    const config = getXcmConfig();
    expect(config).toEqual(CONFIG);
  });

  test('should calculate correct fee for ACA from Acala to Parallel ', () => {
    const fee = estimateFeeFromConfig(
      CONFIG,
      CONFIG.assetsLocation['ACA'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[0].xcmTransfers[1],
    );

    expect(fee.toString()).toEqual('117647058823');
  });

  test('should calculate correct fee for DOT from Acala to Parallel', () => {
    const fee = estimateFeeFromConfig(
      CONFIG,
      CONFIG.assetsLocation['DOT'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[1].xcmTransfers[0],
    );

    expect(fee.toString()).toEqual('403808327');
  });

  test('should calculate correct location for sibling prachain', () => {
    const location = getDestinationLocation({ parentId: '0x00' }, 2000) as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1.Parachain).toEqual(2000);
  });

  test('should calculate correct location for parent parachain', () => {
    const location = getDestinationLocation({ parentId: '0x00' }) as any;

    expect(location.parents).toEqual(1);
    expect(location.interior).toEqual('Here');
  });

  test('should calculate correct address location for parent parachain', () => {
    const location = getDestinationLocation({ parentId: '0x00' }, undefined, '0x00') as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1.AccountId32.id).toEqual('0x00');
  });

  test('should calculate correct location for child parachain', () => {
    const location = getDestinationLocation({ parentId: undefined }, 2000) as any;

    expect(location.parents).toEqual(0);
    expect(location.interior.X1.Parachain).toEqual(2000);
  });

  test('should parse xcmPallet relaychain > parachain', () => {
    const result = parseXcmPalletExtrinsic(XCMPALLET_TRANSFER_KSM_BIFROST);

    expect(result).toEqual({
      isRelayToken: true,
      amount: '10070392000',
      destParachain: 2001,
      destAccountId: '0x7a28037947ecebe0dd86dc0e910911cb33185fd0714b37b75943f67dcf9b6e7c',
      assetGeneralIndex: '',
      toRelayChain: false,
      type: 'xcmPallet',
    });
  });

  test('should parse xcmPallet parachain > parachain', () => {
    const result = parseXcmPalletExtrinsic(XCMPALLET_TRANSFER_HUB_ASTAR);

    expect(result).toEqual({
      isRelayToken: false,
      amount: '176500000',
      destParachain: 2006,
      destAccountId: '0x4d081065a791aaabf8c4c9ec8ed87dce10145c86869c66e80286645730d70c44',
      assetGeneralIndex: '1984',
      toRelayChain: false,
      type: 'xcmPallet',
    });
  });

  test('should parse xTokens parachain > parachain', () => {
    const result = parseXTokensExtrinsic(XTOKENS_ACA_PARALLEL);

    expect(result).toEqual({
      isRelayToken: false,
      amount: '617647058823',
      destParachain: 2012,
      destAccountId: '0xd02b1de0e29d201d48f1a48fb0ead05bf292366ffe90efec9368bb2c7849de59',
      assetParachain: 2000,
      assetGeneralKey: '0x0000',
      toRelayChain: false,
      type: 'xTokens',
    });
  });

  test('should parse xTokens parachain > relaychain', () => {
    const result = parseXTokensExtrinsic(XTOKENS_ACA_DOT);

    expect(result).toEqual({
      isRelayToken: true,
      amount: '4371581450',
      destParachain: 0,
      destAccountId: '0x7a28037947ecebe0dd86dc0e910911cb33185fd0714b37b75943f67dcf9b6e7c',
      assetGeneralKey: '',
      assetParachain: 0,
      toRelayChain: true,
      type: 'xTokens',
    });
  });
});
