import { render, screen, act } from '@testing-library/react';
import { hexToU8a } from '@polkadot/util';

import { SeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { CryptoTypeString, CryptoType } from '@renderer/domain/shared-kernel';
import StepThree from './StepThree';
import { Chain } from '@renderer/domain/chain';
import { TEST_ACCOUNT_ID, TEST_ADDRESS } from '@renderer/shared/utils/constants';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/account/accountService', () => ({
  useAccount: jest.fn().mockReturnValue({
    addAccount: jest.fn(),
    toggleActiveAccount: jest.fn(),
  }),
}));

jest.mock('@renderer/services/wallet/walletService', () => ({
  useWallet: jest.fn().mockReturnValue({
    addWallet: jest.fn(),
  }),
}));

jest.mock('@renderer/services/network/chainsService', () => ({
  useChains: jest.fn().mockReturnValue({
    sortChains: jest.fn((value: Chain[]) => value),
    getChainsData: jest.fn().mockResolvedValue([
      {
        addressPrefix: 0,
        assets: [],
        chainId: '0x00',
        name: 'My test chain',
      },
    ]),
  }),
}));

describe('screens/Onboard/Parity/StepThree', () => {
  const WND_ADDRESS = '5CGQ7BPJZZKNirQgVhzbX9wdkgbnUHtJ5V7FkMXdZeVbXyr9';
  const qrData: SeedInfo[] = [
    {
      name: 'test wallet',
      multiSigner: { MultiSigner: CryptoTypeString.SR25519, public: hexToU8a(TEST_ACCOUNT_ID) },
      derivedKeys: [
        {
          address: '5E7TYrCi6Yc2rZkU1x9hERoJSMyN3vDgNPmt3RFMtYBpzC1o',
          derivationPath: '//test',
          encryption: CryptoType.ED25519,
          genesisHash: new Uint8Array([0]),
        },
      ],
    },
  ];

  test('should render component', async () => {
    await act(async () => {
      render(<StepThree qrData={qrData} onNextStep={() => {}} />);
    });

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(5);
  });

  test('should render 1 root 1 derived', async () => {
    await act(async () => {
      render(<StepThree qrData={qrData} onNextStep={() => {}} />);
    });

    const root = screen.getByDisplayValue('5CGQ7BPJZZ...XdZeVbXyr9');
    const derived = screen.getByDisplayValue('5E7TYrCi6Y...FMtYBpzC1o');
    expect(root).toBeInTheDocument();
    expect(derived).toBeInTheDocument();
  });

  test('should lead to root block explorers', async () => {
    window.HTMLElement.prototype.scrollIntoView = jest.fn();

    await act(async () => {
      render(<StepThree qrData={qrData} onNextStep={() => {}} />);
    });

    const button = screen.getByTestId(`explorers-${TEST_ADDRESS}`);
    await act(async () => button.click());

    const links = screen.getAllByRole('menuitem');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `https://subscan.io/account/${WND_ADDRESS}`);
    expect(links[1]).toHaveAttribute('href', `https://sub.id/${WND_ADDRESS}`);
  });
});
