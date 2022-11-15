import { render } from '@testing-library/react';

import Bond from './Bond';

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('screens/Bond/ConfirmBond', () => {
  test('should render component', () => {
    render(<Bond />);
  });
});
