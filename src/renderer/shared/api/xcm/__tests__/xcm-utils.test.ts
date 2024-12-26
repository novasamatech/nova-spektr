import { xcmUtils } from '../lib/xcm-utils';

import { CONFIG } from './mock/xcmData';

describe('shared/api/xcm/lib/xcm-utils', () => {
  test('should calculate correct fee for ACA from Acala to Parallel ', () => {
    const fee = xcmUtils.getEstimatedFeeFromConfig(
      CONFIG,
      CONFIG.assetsLocation['ACA'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[0].xcmTransfers[1],
    );

    expect(fee.toString()).toEqual('117647058823');
  });

  test('should calculate correct fee for DOT from Acala to Parallel', () => {
    const fee = xcmUtils.getEstimatedFeeFromConfig(
      CONFIG,
      CONFIG.assetsLocation['DOT'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[1].xcmTransfers[0],
    );

    expect(fee.toString()).toEqual('403808327');
  });

  test('should calculate correct fee when reserveFee is undefined', () => {
    const fee = xcmUtils.getEstimatedFeeFromConfig(
      CONFIG,
      CONFIG.assetsLocation['Statemint'],
      'origin-chain',
      CONFIG.chains[2].assets[0].xcmTransfers[0],
    );

    expect(fee.toString()).toEqual('3999999999');
  });

  test('should calculate correct location for sibling prachain', () => {
    const location = xcmUtils.getDestinationLocation('V2', { parentId: '0x00' }, 2000) as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1.Parachain).toEqual(2000);
  });

  test('should calculate correct location for parent parachain', () => {
    const location = xcmUtils.getDestinationLocation('V2', { parentId: '0x00' }) as any;

    expect(location.parents).toEqual(1);
    expect(location.interior).toEqual('Here');
  });

  test('should calculate correct address location for parent parachain', () => {
    const location = xcmUtils.getDestinationLocation('V2', { parentId: '0x00' }, undefined, '0x00') as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1.AccountId32.id).toEqual('0x00');
  });

  test('should calculate correct address location for parent parachain V4', () => {
    const location = xcmUtils.getDestinationLocation('V4', { parentId: '0x00' }, undefined, '0x00') as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1[0].AccountId32.id).toEqual('0x00');
  });

  test('should calculate correct address location for parent parachain V4', () => {
    const location = xcmUtils.getDestinationLocation(
      'V4',
      { parentId: '0x00' },
      undefined,
      '0x3da9ea1622ee74cf87144e3d2c7f7cce4d167d9c',
    ) as any;

    expect(location.parents).toEqual(1);
    expect(location.interior.X1[0].AccountKey20.key).toEqual('0x3da9ea1622ee74cf87144e3d2c7f7cce4d167d9c');
  });

  test('should calculate correct location for child parachain', () => {
    const location = xcmUtils.getDestinationLocation('V2', { parentId: undefined }, 2000) as any;

    expect(location.parents).toEqual(0);
    expect(location.interior.X1.Parachain).toEqual(2000);
  });

  test('should calculate correct location for child parachain V4', () => {
    const location = xcmUtils.getDestinationLocation('V4', { parentId: undefined }, 2000) as any;

    expect(location.parents).toEqual(0);
    expect(location.interior.X1[0].Parachain).toEqual(2000);
  });
});
