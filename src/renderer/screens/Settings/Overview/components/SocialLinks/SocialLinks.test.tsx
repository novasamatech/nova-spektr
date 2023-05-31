import { render, screen } from '@testing-library/react';

import { SocialLinks } from './SocialLinks';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Overview/SocialLinks', () => {
  test('should render all social links', () => {
    render(<SocialLinks />);

    const label = screen.getByText('settings.overview.socialLabel');
    const links = screen.getAllByRole('link');
    expect(label).toBeInTheDocument();
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', 'https://twitter.com/NovasamaTech');
    expect(links[1]).toHaveAttribute('href', 'https://github.com/novasamatech/nova-spektr');
    expect(links[2]).toHaveAttribute('href', 'https://www.youtube.com/@NovasamaTech');
    expect(links[3]).toHaveAttribute('href', 'https://medium.com');
    expect(links[4]).toHaveAttribute('href', 'https://telegram.com');
  });
});
