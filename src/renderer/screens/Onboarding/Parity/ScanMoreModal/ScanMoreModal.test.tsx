import { act, render, screen } from '@testing-library/react';

import { AddressInfo, SeedInfo, CompactSeedInfo } from '@renderer/components/common/QrCode/QrReader/common/types';
import { CryptoType, CryptoTypeString } from '@renderer/domain/shared-kernel';
import ParitySignerQrReader from '../ParitySignerQrReader/ParitySignerQrReader';
import ScanMoreModal from './ScanMoreModal';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('../ParitySignerQrReader/ParitySignerQrReader', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('screens/Onboarding/Parity/ScanMoreModal', () => {
  const ROOT_ADDRESS = '15hwmZknpCaGffUFKHSLz8wNeQPuhvdD5cc1o1AGiL4QHoU7';
  const DERIVED_ADDRESS = '167fCN8s3z9tdZhHrmdfoyXGqRStp4phop3p2LCBXQPVx4Ei';
  const ROOT_PUBLIC_KEY = [
    208, 43, 29, 224, 226, 157, 32, 29, 72, 241, 164, 143, 176, 234, 208, 91, 242, 146, 54, 111, 254, 144, 239, 236,
    147, 104, 187, 44, 120, 73, 222, 89,
  ];

  const createRootQrPayload = (accountId: number[], derived: string[] = []): SeedInfo => ({
    name: '',
    derivedKeys: derived.map(createDerivedPayload),
    multiSigner: { MultiSigner: CryptoTypeString.SR25519, public: new Uint8Array(accountId) },
  });

  const createDerivedPayload = (derived: string, index: number): AddressInfo => ({
    address: derived,
    derivationPath: `//test-${index}`,
    encryption: CryptoType.ED25519,
    genesisHash: new Uint8Array([0]),
  });

  const renderWithAccounts = async (oldAccs: CompactSeedInfo[], qrPayload: SeedInfo[]) => {
    const spyResult = jest.fn();
    (ParitySignerQrReader as jest.Mock).mockImplementation(({ onResult }: any) => (
      <button type="button" onClick={() => onResult(qrPayload)}>
        paritySignerQrReader
      </button>
    ));
    render(<ScanMoreModal isOpen seedInfo={oldAccs} onResult={spyResult} onClose={() => {}} />);

    const qrReader = screen.getByRole('button', { name: 'paritySignerQrReader' });
    await act(async () => qrReader.click());

    return spyResult;
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(<ScanMoreModal isOpen seedInfo={[]} onResult={() => {}} onClose={() => {}} />);
    });

    const modalTitle = screen.getByText('onboarding.paritySigner.qrModalTitle');
    expect(modalTitle).toBeInTheDocument();
  });

  // We have: 1 derived, receive: 1 derived
  test('should render account exists state', async () => {
    const oldAccs: CompactSeedInfo[] = [{ address: DERIVED_ADDRESS, derivedKeys: {} }];
    const qrPayload: SeedInfo[] = [
      createRootQrPayload([
        226, 65, 55, 251, 108, 96, 245, 152, 153, 32, 22, 197, 5, 226, 224, 219, 19, 33, 85, 67, 151, 63, 167, 99, 98,
        228, 136, 247, 222, 94, 31, 124,
      ]),
    ];
    const spyResult = await renderWithAccounts(oldAccs, qrPayload);

    const accountExists = screen.getByText('onboarding.paritySigner.existingAccountDescription');
    const shortAddress = screen.getByText(/167fCN8s3z9/);
    expect(accountExists).toBeInTheDocument();
    expect(shortAddress).toBeInTheDocument();
    expect(spyResult).not.toBeCalled();
  });

  // We have: 2 derived, receive: 1 root + 4 derived
  test('should render some accounts exist state_1', async () => {
    const oldAccs: CompactSeedInfo[] = [
      { address: DERIVED_ADDRESS, derivedKeys: {} },
      { address: '15dQe7XkGCExuWYH72VcDkf74aTT7ncDfKVtTKs2DHrbA2cY', derivedKeys: {} },
    ];
    const qrPayload: SeedInfo[] = [
      createRootQrPayload(ROOT_PUBLIC_KEY, [
        'Cdt6mgcXHFzAQkATy15QMHCBEjVqTSVcEqdhvrbE29eS4SK',
        '5ChqJwP89ajjGaS6mZjP5N2mT6BJ7ztVQMM1EaZ4tyPGFsQ3',
        '15dQe7XkGCExuWYH72VcDkf74aTT7ncDfKVtTKs2DHrbA2cY',
        DERIVED_ADDRESS,
      ]),
    ];
    const spyResult = await renderWithAccounts(oldAccs, qrPayload);

    const result = {
      ...qrPayload[0],
      derivedKeys: [qrPayload[0].derivedKeys[0], qrPayload[0].derivedKeys[1]],
    };
    const accountExists = screen.getByText('onboarding.paritySigner.someOldAccountDescription');
    expect(accountExists).toBeInTheDocument();
    expect(spyResult).toBeCalledWith([result]);
  });

  // We have: 1 root, 1 derived, receive: 1 root + 4 derived
  test('should render some accounts exist state_2', async () => {
    const oldAccs: CompactSeedInfo[] = [
      { address: ROOT_ADDRESS, derivedKeys: {} },
      { address: DERIVED_ADDRESS, derivedKeys: {} },
    ];
    const qrPayload: SeedInfo[] = [
      createRootQrPayload(ROOT_PUBLIC_KEY, [
        'Cdt6mgcXHFzAQkATy15QMHCBEjVqTSVcEqdhvrbE29eS4SK',
        '5ChqJwP89ajjGaS6mZjP5N2mT6BJ7ztVQMM1EaZ4tyPGFsQ3',
        '15dQe7XkGCExuWYH72VcDkf74aTT7ncDfKVtTKs2DHrbA2cY',
        DERIVED_ADDRESS,
      ]),
    ];
    const spyResult = await renderWithAccounts(oldAccs, qrPayload);

    const result = {
      ...qrPayload[0],
      derivedKeys: [qrPayload[0].derivedKeys[0], qrPayload[0].derivedKeys[1], qrPayload[0].derivedKeys[2]],
    };
    const accountExists = screen.getByText('onboarding.paritySigner.someOldAccountDescription');
    expect(accountExists).toBeInTheDocument();
    expect(spyResult).toBeCalledWith([result]);
  });

  // We have: 1 root, 1 derived, receive: 1 root + 1 same derived
  test('should render no new accounts state_1', async () => {
    const oldAccs: CompactSeedInfo[] = [
      { address: ROOT_ADDRESS, derivedKeys: {} },
      { address: DERIVED_ADDRESS, derivedKeys: {} },
    ];
    const qrPayload: SeedInfo[] = [createRootQrPayload(ROOT_PUBLIC_KEY, [DERIVED_ADDRESS])];
    const spyResult = await renderWithAccounts(oldAccs, qrPayload);

    const accountExists = screen.getByText('onboarding.paritySigner.noNewAccountDescription');
    expect(accountExists).toBeInTheDocument();
    expect(spyResult).not.toBeCalled();
  });

  // We have: 1 root + 1 derived, receive: 1 root + 1 same derived
  test('should render no new accounts state_2', async () => {
    const oldAccs: CompactSeedInfo[] = [
      {
        address: ROOT_ADDRESS,
        derivedKeys: { '0x123': [createDerivedPayload(DERIVED_ADDRESS, 0)] },
      },
    ];
    const qrPayload: SeedInfo[] = [createRootQrPayload(ROOT_PUBLIC_KEY, [DERIVED_ADDRESS])];
    const spyResult = await renderWithAccounts(oldAccs, qrPayload);

    const accountExists = screen.getByText('onboarding.paritySigner.noNewAccountDescription');
    expect(accountExists).toBeInTheDocument();
    expect(spyResult).not.toBeCalled();
  });
});
