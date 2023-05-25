import { render, screen } from '@testing-library/react';

import Actions from './Actions';
jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));
describe('screens/Staking/Overview/Actions', () => {
  test('should create component', () => {
    render(<Actions />);

    const text = screen.getByText('staking.overview.filterButton');
    expect(text).toBeInTheDocument();
  });
});
