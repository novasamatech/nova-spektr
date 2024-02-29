import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MatrixInfoPopover } from '../MatrixInfoPopover';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@app/providers', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Settings/Matrix/MatrixInfoPopover', () => {
  test('should render component', async () => {
    const user = userEvent.setup();

    render(<MatrixInfoPopover />);

    const popoverButton = screen.getByTestId('labelHelpbox');
    await user.hover(popoverButton);

    const titleWhy = await screen.findByText('settings.matrix.infoWhyMatrixTitle');
    const titleWhat = screen.getByText('settings.matrix.infoWhatIsMatrixTitle');

    expect(titleWhy).toBeInTheDocument();
    expect(titleWhat).toBeInTheDocument();
  });
});
