import { render, screen } from '@testing-library/react';

import { ValidatorMap } from '@renderer/services/staking/common/types';
import { Expandable, ValidatorsTable } from '@renderer/components/common';
import NominatorsModal from './NominatorsModal';

jest.mock('@renderer/components/common');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

window.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

describe('screens/Staking/Overview/NominatorsModal', () => {
  const elected = {
    '0x123': {
      address: '0x123',
      identity: {
        subName: 'subName',
        parent: { name: 'parent', address: '0x098' },
      },
    },
  } as unknown as ValidatorMap;

  const notElected = {
    '0x777': {
      address: '0x777',
      identity: {
        subName: 'subName',
        parent: { name: 'parent', address: '0x456' },
      },
    },
  } as unknown as ValidatorMap;

  beforeAll(() => {
    (ValidatorsTable as jest.Mock).mockImplementation(() => 'validators');
    (Expandable as jest.Mock).mockImplementation(({ children, item }: any) => (
      <div>
        {item}
        {children}
      </div>
    ));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<NominatorsModal isOpen stash="0x555" validators={elected} nominators={elected} onClose={() => {}} />);

    const title = screen.getByText('staking.nominators.yourValidatorsTitle');
    const blocks = screen.getByText('validators');
    const electedBlock = screen.getByText('staking.nominators.electedTitle');
    expect(title).toBeInTheDocument();
    expect(blocks).toBeInTheDocument();
    expect(electedBlock).toBeInTheDocument();
  });

  test('should render not elected data', () => {
    render(<NominatorsModal isOpen stash="0x555" validators={elected} nominators={notElected} onClose={() => {}} />);

    const title = screen.getByText('staking.nominators.yourValidatorsTitle');
    const blocks = screen.getByText('validators');
    const electedBlock = screen.getByText('staking.nominators.notElectedTitle');
    expect(title).toBeInTheDocument();
    expect(blocks).toBeInTheDocument();
    expect(electedBlock).toBeInTheDocument();
  });

  test('should render no results', () => {
    render(<NominatorsModal isOpen stash="0x555" validators={elected} nominators={{}} onClose={() => {}} />);

    const label = screen.getByText('staking.overview.noValidatorsLabel');
    const description = screen.getByText('staking.overview.noValidatorsDescription');
    expect(label).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});
