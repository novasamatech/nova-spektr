import { ApiPromise } from '@polkadot/api';
import { act, render, screen } from '@testing-library/react';

import { ValidatorsTable } from '@renderer/components/common';
import { Asset } from '@renderer/domain/asset';
import Validators from './Validators';

jest.mock('@renderer/components/common');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('@renderer/services/staking/validatorsService', () => ({
  useValidators: jest.fn().mockReturnValue({
    getMaxValidators: jest.fn().mockReturnValue(6),
    getValidators: jest.fn().mockReturnValue({}),
  }),
}));

jest.mock('@renderer/services/staking/eraService', () => ({
  useEra: jest.fn().mockReturnValue({
    subscribeActiveEra: jest.fn().mockImplementation((api: any, eraCallback: any) => eraCallback(1)),
  }),
}));

describe('screens/Staking/components/Validators', () => {
  beforeEach(() => {
    (ValidatorsTable as jest.Mock).mockImplementation(() => 'validatorsTable');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', async () => {
    const api = { isConnected: true } as ApiPromise;
    const asset = {
      assetId: 0,
      symbol: 'WND',
      precision: 12,
      staking: 'relaychain',
    } as Asset;

    await act(async () => {
      render(<Validators api={api} chainId="0x123" asset={asset} onResult={() => {}} />);
    });

    const table = screen.getByText('validatorsTable');
    const continueButton = screen.getByRole('button', { name: 'staking.validators.selectValidatorButton' });
    expect(table).toBeInTheDocument();
    expect(continueButton).toBeInTheDocument();
  });
});
