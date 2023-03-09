import { render, screen } from '@testing-library/react';

import InfoSection from './InfoSection';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/InfoSection', () => {
  test('should render component', () => {
    render(<InfoSection />);

    const titleWhy = screen.getByText('settings.matrix.infoWhyMatrixTitle');
    const titleWhat = screen.getByText('settings.matrix.infoWhatIsMatrixTitle');

    expect(titleWhy).toBeInTheDocument();
    expect(titleWhat).toBeInTheDocument();
  });
});
