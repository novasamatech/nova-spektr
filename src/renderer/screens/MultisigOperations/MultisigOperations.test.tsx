import { render, screen } from '@testing-library/react';

import MultisigOperations from './MultisigOperations';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screen/MultisigOperations', () => {
  test('should render component', () => {
    render(<MultisigOperations />);

    const text = screen.getByText('multisigOperations.title');
    expect(text).toBeInTheDocument();
  });
});
