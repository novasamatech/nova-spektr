import { render, screen } from '@testing-library/react';

import { Overview } from './Overview';

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

jest.mock('./components', () => ({
  GeneralActions: () => <span>generalActions</span>,
  SocialLinks: () => <span>socialLinks</span>,
  MatrixAction: () => <span>matrixAction</span>,
  Version: () => <span>version</span>,
}));

describe('pages/Settings/Overview', () => {
  test('should render all parts', () => {
    render(<Overview />);

    const title = screen.getByText('settings.title');
    const generalActions = screen.getByText('generalActions');
    const matrixAction = screen.getByText('matrixAction');
    const socialLinks = screen.getByText('socialLinks');
    const version = screen.getByText('version');
    expect(title).toBeInTheDocument();
    expect(generalActions).toBeInTheDocument();
    expect(socialLinks).toBeInTheDocument();
    expect(matrixAction).toBeInTheDocument();
    expect(version).toBeInTheDocument();
  });
});
