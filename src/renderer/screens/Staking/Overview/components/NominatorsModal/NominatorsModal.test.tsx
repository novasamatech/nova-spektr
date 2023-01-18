import { render, screen } from '@testing-library/react';

import NominatorsModal, { Nominator } from './NominatorsModal';
import { Balance, BaseModal } from '@renderer/components/ui';

jest.mock('@renderer/components/ui');

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Staking/Overview/NominatorsModal', () => {
  const elected = [
    {
      apy: '17.11',
      address: '5Ek5JCnrRsyUGYNRaEvkufG1i1EUxEE9cytuWBBjA9oNZVsf',
      identity: 'Parity Westend validator 5',
      nominated: '5829134798766',
    },
  ];
  const notElected = [
    {
      address: '5GNy7frYA4BwWpKwxKAFWt4eBsZ9oAvXrp9SyDj6qzJAaNzB',
    },
  ] as Nominator[];

  beforeAll(() => {
    (Balance as jest.Mock).mockImplementation(({ value }: any) => <p>{value}</p>);
    (BaseModal as jest.Mock).mockImplementation(({ children }: any) => children);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render component', () => {
    render(<NominatorsModal isOpen elected={elected} notElected={notElected} onClose={() => {}} />);

    const blockOne = screen.getByText('staking.nominators.electedTitle');
    const blockTwo = screen.getByText('staking.nominators.notElectedTitle');
    expect(blockOne).toBeInTheDocument();
    expect(blockTwo).toBeInTheDocument();
  });

  test('should render elected data', () => {
    render(<NominatorsModal isOpen elected={elected} notElected={[]} onClose={() => {}} />);

    const items = screen.getByRole('listitem');
    const identity = screen.getByText(elected[0].identity);
    const apy = screen.getByText(`${elected[0].apy}%`);
    const nominated = screen.getByText(elected[0].nominated);
    expect(items).toBeInTheDocument();
    expect(identity).toBeInTheDocument();
    expect(apy).toBeInTheDocument();
    expect(nominated).toBeInTheDocument();
  });

  test('should render not elected data', () => {
    render(<NominatorsModal isOpen elected={[]} notElected={notElected} onClose={() => {}} />);

    const items = screen.getByRole('listitem');
    const address = screen.getByText(new RegExp(notElected[0].address.slice(0, 10)));
    expect(items).toBeInTheDocument();
    expect(address).toBeInTheDocument();
  });
});

export {};
