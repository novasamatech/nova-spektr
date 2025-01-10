import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Overview } from './Overview';
vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

vi.mock('./components', () => ({
  GeneralActions: () => <span>generalActions</span>,
  SocialLinks: () => <span>socialLinks</span>,
  Version: () => <span>version</span>,
}));

describe('pages/Settings/Overview', () => {
  test('should render all parts', () => {
    render(<Overview />);

    const title = screen.getByText('settings.title');
    const generalActions = screen.getByText('generalActions');
    const socialLinks = screen.getByText('socialLinks');
    const version = screen.getByText('version');
    expect(title).toBeInTheDocument();
    expect(generalActions).toBeInTheDocument();
    expect(socialLinks).toBeInTheDocument();
    expect(version).toBeInTheDocument();
  });
});
