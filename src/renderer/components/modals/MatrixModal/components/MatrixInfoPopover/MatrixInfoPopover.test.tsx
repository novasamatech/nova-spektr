import { render, screen } from '@testing-library/react';

import MatrixInfoPopover from './MatrixInfoPopover';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Settings/Matrix/InfoSection', () => {
  test('should render component', () => {
    render(<MatrixInfoPopover />);

    const titleWhy = screen.getByText('settings.matrix.infoWhyMatrixTitle');
    const titleWhat = screen.getByText('settings.matrix.infoWhatIsMatrixTitle');

    expect(titleWhy).toBeInTheDocument();
    expect(titleWhat).toBeInTheDocument();
  });
});
