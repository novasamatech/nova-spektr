import { render, screen } from '@testing-library/react';

import { Version } from './Version';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/Settings/Overview/Version', () => {
  test('should render app version', () => {
    process.env.VERSION = '1.0.0';
    render(<Version />);

    const version = screen.getByText(`settings.overview.versionLabel ${process.env.VERSION}`);
    expect(version).toBeInTheDocument();
  });
});
