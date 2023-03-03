import { render, screen } from '@testing-library/react';

import InfoSection from './InfoSection';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/InfoSection', () => {
  test('should render component', () => {
    render(<InfoSection />);

    const title = screen.getByText('info');
    expect(title).toBeInTheDocument();
  });
});
