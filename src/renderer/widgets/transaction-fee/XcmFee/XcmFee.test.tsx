import { type ApiPromise } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { act, render, screen, waitFor } from '@testing-library/react';
import { fork } from 'effector';
import { Provider } from 'effector-react';
import { vi } from 'vitest';

import { spellXcmService } from '@/shared/api/xcm';
import { type Asset, type Chain, type ChainId, type Transaction, AssetType } from '@/shared/core';
import { createAccountId } from '@/shared/mocks';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { priceProviderModel } from '@/domains/price';
import { networkModel } from '@/entities/network';

import { XcmFee } from './XcmFee';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/ui-entities', () => ({
  AssetBalance: ({ value }: { value: string }) => <div data-testid="asset-balance">{value}</div>,
}));

vi.mock('@/widgets/price', async (importOriginal) => ({
  ...(await importOriginal()),
  AssetFiatBalance: () => <div data-testid="fiat-balance" />,
}));

vi.mock('@/shared/api/xcm', () => ({
  spellXcmService: {
    createBuilderConfig: vi.fn(),
    getXcmFees: vi.fn(),
  },
}));

const mockOriginChain: Chain = {
  name: 'Polkadot',
  specName: 'polkadot',
  addressPrefix: 0,
  chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' as ChainId,
  icon: '',
  options: [],
  nodes: [],
  assets: [],
  explorers: [],
};

const mockDestinationChain: Chain = {
  name: 'Kusama',
  specName: 'kusama',
  addressPrefix: 2,
  chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe' as ChainId,
  icon: '',
  options: [],
  nodes: [],
  assets: [],
  explorers: [],
};

const mockAsset: Asset = {
  assetId: 0 as Asset['assetId'],
  symbol: 'DOT',
  name: 'Polkadot',
  precision: 10,
  type: AssetType.NATIVE,
  priceId: 'polkadot',
  icon: {
    monochrome: '',
    colored: '',
  },
};

const mockApi = {} as ApiPromise;

const createScope = (chains = {}, apis = {}) =>
  fork({
    values: new Map()
      .set(networkModel.$chains, chains)
      .set(networkModel.$apis, apis)
      .set(priceProviderModel.$fiatFlag, false),
  });

const createMockTransaction = (overrides?: Partial<Transaction>): Transaction =>
  ({
    accountId: createAccountId('test') as AccountId,
    chainId: mockOriginChain.chainId,
    args: {
      destinationChain: mockDestinationChain.chainId,
      value: '10000000000',
      dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    },
    ...overrides,
  }) as Transaction;

const setupSuccessfulFeeCalculation = () => {
  vi.mocked(spellXcmService.createBuilderConfig).mockReturnValue({
    abstractDecimals: true,
    apiOverrides: {
      Polkadot: mockApi,
      Kusama: mockApi,
    },
  });
};

describe('widgets/transaction-fee/XcmFee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should render destination fee when successfully calculated', async () => {
    const scope = createScope(
      {
        [mockOriginChain.chainId]: mockOriginChain,
        [mockDestinationChain.chainId]: mockDestinationChain,
      },
      {
        [mockOriginChain.chainId]: mockApi,
        [mockDestinationChain.chainId]: mockApi,
      },
    );

    setupSuccessfulFeeCalculation();

    vi.mocked(spellXcmService.getXcmFees).mockResolvedValue({
      originFee: new BN(1000000000),
      destinationFee: new BN(2000000000),
    });

    const transaction = createMockTransaction();

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={transaction} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('2000000000');
    });
  });

  test('should render zero fee when transaction data is missing', async () => {
    const scope = createScope();

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={null} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('0');
    });
  });

  test('should render zero fee when chains or APIs are missing', async () => {
    const scope = createScope(
      {
        [mockOriginChain.chainId]: mockOriginChain,
      },
      {
        [mockOriginChain.chainId]: mockApi,
      },
    );

    const transaction = createMockTransaction();

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={transaction} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('0');
    });
  });

  test('should render zero fee when getXcmFees fails', async () => {
    const scope = createScope(
      {
        [mockOriginChain.chainId]: mockOriginChain,
        [mockDestinationChain.chainId]: mockDestinationChain,
      },
      {
        [mockOriginChain.chainId]: mockApi,
        [mockDestinationChain.chainId]: mockApi,
      },
    );

    setupSuccessfulFeeCalculation();
    vi.mocked(spellXcmService.getXcmFees).mockRejectedValue(new Error('Failed'));

    const transaction = createMockTransaction();

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={transaction} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('0');
    });
  });

  test('should use external fee when provided', async () => {
    const scope = createScope();
    const externalFee = new BN(5000000000);

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={createMockTransaction()} fee={externalFee} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('5000000000');
    });

    expect(spellXcmService.getXcmFees).not.toHaveBeenCalled();
  });

  test('should apply multiply factor to fee', async () => {
    const scope = createScope(
      {
        [mockOriginChain.chainId]: mockOriginChain,
        [mockDestinationChain.chainId]: mockDestinationChain,
      },
      {
        [mockOriginChain.chainId]: mockApi,
        [mockDestinationChain.chainId]: mockApi,
      },
    );

    setupSuccessfulFeeCalculation();

    vi.mocked(spellXcmService.getXcmFees).mockResolvedValue({
      originFee: new BN(500000000),
      destinationFee: new BN(1000000000),
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={createMockTransaction()} multiply={3} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('asset-balance')).toHaveTextContent('3000000000');
    });
  });

  test('should call onFeeChange callback when fee is calculated', async () => {
    const scope = createScope(
      {
        [mockOriginChain.chainId]: mockOriginChain,
        [mockDestinationChain.chainId]: mockDestinationChain,
      },
      {
        [mockOriginChain.chainId]: mockApi,
        [mockDestinationChain.chainId]: mockApi,
      },
    );

    setupSuccessfulFeeCalculation();

    const destinationFee = new BN(2000000000);
    const onFeeChange = vi.fn();

    vi.mocked(spellXcmService.getXcmFees).mockResolvedValue({
      originFee: new BN(1000000000),
      destinationFee,
    });

    await act(async () => {
      render(
        <Provider value={scope}>
          <XcmFee api={mockApi} asset={mockAsset} transaction={createMockTransaction()} onFeeChange={onFeeChange} />
        </Provider>,
      );
    });

    await waitFor(() => {
      expect(onFeeChange).toHaveBeenCalledWith(destinationFee);
    });
  });
});
