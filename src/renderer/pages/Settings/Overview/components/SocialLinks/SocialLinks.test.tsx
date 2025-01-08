import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SocialLinks } from './SocialLinks';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Overview/SocialLinks', () => {
  test('should render all social links', () => {
    render(<SocialLinks />);

    const label = screen.getByText('settings.overview.socialLabel');
    const links = screen.getAllByRole('link');
    expect(label).toBeInTheDocument();
    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', 'https://x.com/NovaSpektr');
    expect(links[1]).toHaveAttribute('href', 'https://github.com/novasamatech/nova-spektr');
    expect(links[2]).toHaveAttribute('href', 'https://www.youtube.com/@NovaSpektr');
    expect(links[3]).toHaveAttribute('href', 'https://medium.com/@NovaSpektr');
    expect(links[4]).toHaveAttribute('href', 'https://t.me/+dL5b4g6BmMUyYTRi');
  });
});
