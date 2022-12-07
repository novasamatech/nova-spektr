import { render, screen } from '@testing-library/react';

import InfoBanners from './InfoBanners';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Staking/Overview/InfoBanners', () => {
  test('should create component', () => {
    render(<InfoBanners />);

    const text = screen.getByText('staking.overview.filterButton');
    expect(text).toBeInTheDocument();
  });
});
