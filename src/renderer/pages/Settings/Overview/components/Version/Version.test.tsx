import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Version } from './Version';

vi.mock('@/shared/i18n', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Overview/Version', () => {
  test('should render app version', () => {
    process.env.VERSION = '1.0.0';
    render(<Version />);

    const version = screen.getByText(`settings.overview.versionLabel ${process.env.VERSION}`);
    expect(version).toBeInTheDocument();
  });
});
