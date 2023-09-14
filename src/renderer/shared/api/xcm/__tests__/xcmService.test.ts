import { XCM_KEY } from '../common/constants';
import { estimateFee, getXcmConfig, getDestinationLocation } from '../xcmService';
import { CONFIG } from '@renderer/shared/api/xcm/__tests__/mock/xcmData';

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
    const fee = estimateFee(
      CONFIG,
      CONFIG.assetsLocation['ACA'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[0].xcmTransfers[1],
    );

    expect(fee.toString()).toEqual('117647058823');
  });

  test('should calculate correct fee for DOT from Acala to Parallel', () => {
    const fee = estimateFee(
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
});
