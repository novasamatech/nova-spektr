import { xcmService } from '../service/xcmService';

import {
  CONFIG,
  XCMPALLET_TRANSFER_HUB_ASTAR,
  XCMPALLET_TRANSFER_KSM_BIFROST,
  XTOKENS_ACA_DOT,
  XTOKENS_ACA_PARALLEL,
} from './mock/xcmData';

describe('shared/api/xcm/service/xcm-service', () => {
  test('should parse xcmPallet relaychain > parachain', () => {
    const result = xcmService.parseXcmPalletExtrinsic(XCMPALLET_TRANSFER_KSM_BIFROST);

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
    const result = xcmService.parseXcmPalletExtrinsic(XCMPALLET_TRANSFER_HUB_ASTAR);

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
    const result = xcmService.parseXTokensExtrinsic(XTOKENS_ACA_PARALLEL);

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
    const result = xcmService.parseXTokensExtrinsic(XTOKENS_ACA_DOT);

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

  test('should calculate correct required dest weight when reserveFee is undefined', () => {
    const weight = xcmService.getEstimatedRequiredDestWeight(
      CONFIG,
      CONFIG.assetsLocation['Statemint'],
      'origin-chain',
      CONFIG.chains[2].assets[0].xcmTransfers[0],
    );

    expect(weight.toString()).toEqual('4000000000');
  });
});
