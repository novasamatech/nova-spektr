import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';
import noop from 'lodash/noop';

import { Asset } from '@renderer/domain/asset';
import { Validators } from './Validators';

jest.mock('@renderer/components/common');

jest.mock('@renderer/app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getMaxValidators: jest.fn().mockReturnValue(6),
    getValidatorsWithInfo: jest.fn().mockResolvedValue({
      '5C556QTtg1bJ43GDSgeowa3Ark6aeSHGTac1b2rKSXtgmSmW': {
        address: '5C556QTtg1bJ43GDSgeowa3Ark6aeSHGTac1b2rKSXtgmSmW',
        totalStake: '84293898648764293',
        ownStake: '27425315022592146',
        blocked: false,
      },
    }),
  }),
}));

jest.mock('@renderer/services/staking/eraService', () => ({
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn().mockImplementation((api: any, eraCallback: any) => eraCallback(1)),
  }),
}));

describe('screens/Staking/components/Validators', () => {
  const api = { isConnected: true } as ApiPromise;
  const asset = {
    assetId: 0,
    symbol: 'WND',
    precision: 12,
    staking: 'relaychain',
  } as Asset;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    await act(async () => {
      render(<Validators api={api} chainId="0x123" asset={asset} onResult={noop} onGoBack={noop} />);
    });

    const validators = screen.getByRole('listitem');
    const continueButton = screen.getByRole('button', { name: 'staking.validators.selectValidatorButton' });
    expect(validators).toBeInTheDocument();
    expect(continueButton).toBeInTheDocument();
  });
});
