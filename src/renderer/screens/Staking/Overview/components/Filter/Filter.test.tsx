import { render, screen } from '@testing-library/react';

import Filter from './Filter';
jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));
describe('screens/Staking/Overview/Filter', () => {
  test('should create component', () => {
    render(<Filter />);

    const text = screen.getByText('staking.overview.filterButton');
    expect(text).toBeInTheDocument();
  });
});
