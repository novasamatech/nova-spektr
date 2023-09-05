import { XCM_KEY } from '../common/constants';
import { estimateFee, getXcmConfig } from '../crossChainService';
import { CONFIG } from '../common/testConfig';

describe('shared/api/cross-chain/crossChainService', () => {
  afterEach(() => {
    localStorage.clear();
  });

  test('should get empty config from localStorage', () => {
    localStorage.clear();

    const config = getXcmConfig();
    expect(config).toEqual(null);
  });

  test('should get not empty config from localStorage', () => {
    localStorage.clear();
    localStorage.setItem(XCM_KEY, JSON.stringify(CONFIG));

    const config = getXcmConfig();
    expect(config).toEqual(CONFIG);
  });

  test('should calculate correct fee for ACA from Acala to Parallel ', () => {
    const fee = estimateFee(
      CONFIG.instructions,
      CONFIG.networkBaseWeight,
      CONFIG.assetsLocation['ACA'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[0].xcmTransfers[1],
    );

    expect(fee.toString()).toEqual('117647058823');
  });

  test('should calculate correct fee for DOT from Acala to Parallel', () => {
    const fee = estimateFee(
      CONFIG.instructions,
      CONFIG.networkBaseWeight,
      CONFIG.assetsLocation['DOT'],
      'fc41b9bd8ef8fe53d58c7ea67c794c7ec9a73daf05e6d54b14ff6342c99ba64c',
      CONFIG.chains[0].assets[1].xcmTransfers[0],
    );

    expect(fee.toString()).toEqual('403808327');
  });
});
