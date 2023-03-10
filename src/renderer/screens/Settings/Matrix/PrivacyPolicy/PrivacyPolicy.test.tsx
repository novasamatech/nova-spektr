import { render, screen } from '@testing-library/react';
import { ReactNode, Fragment } from 'react';

import PrivacyPolicy from './PrivacyPolicy';

jest.mock('react-i18next', () => ({
  Trans: ({ i18nKey, components }: any) => (
    <Fragment>
      {i18nKey}
      {Object.values(components).map((component, index) => (
        <Fragment key={index}>{component as ReactNode}</Fragment>
      ))}
    </Fragment>
  ),
}));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/PrivacyPolicy', () => {
  test('should render component', () => {
    render(<PrivacyPolicy />);

    const privacy = screen.getByText('settings.matrix.privacyTitle');
    const footer = screen.getByText('settings.matrix.privacyFooter');
    const links = screen.getAllByRole('link');
    expect(privacy).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://link_1.com');
    expect(links[1]).toHaveAttribute('href', 'https://link_2.com');
  });
});
