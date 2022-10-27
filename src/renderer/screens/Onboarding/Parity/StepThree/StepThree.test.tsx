import { render, screen, act } from '@testing-library/react';
import { hexToU8a } from '@polkadot/util';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { CryptoTypeString } from '@renderer/domain/shared-kernel';
import StepThree from './StepThree';
import { Chain } from '@renderer/domain/chain';
import { TEST_ADDRESS } from '@renderer/services/balance/common/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    addWallet: jest.fn(),
    setActiveWallet: jest.fn(),
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    getChainsData: jest.fn().mockReturnValue([
      {
        addressPrefix: 0,
        assets: [],
        chainId: '0x00',
        name: 'My test chain',
      },
    ]),
    sortChains: (value: Chain[]) => value,
  }),
}));

describe('screens/Onboard/Parity/StepThree', () => {
  test('should render component', async () => {
    const data: SeedInfo[] = [
      {
        name: 'test wallet',
        multiSigner: { MultiSigner: CryptoTypeString.SR25519, public: new Uint8Array([0]) },
        derivedKeys: [
          {
            address: TEST_ADDRESS,
            derivationPath: '//test',
            encryption: 1,
            genesisHash: hexToU8a('0x00'),
          },
        ],
      },
    ];

    await act(async () => {
      render(<StepThree qrData={data} onNextStep={() => {}} onPrevStep={() => {}} />);
    });

    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBe(4);
  });
});
