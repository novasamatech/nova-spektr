import { render, screen } from '@testing-library/react';

import AboutStaking from './AboutStaking';

jest.mock('react-i18next', () => ({ Trans: (props: any) => props.i18nKey }));

jest.mock('@renderer/context/I18nContext', () => ({
  useI18n: jest.fn().mockReturnValue({
    t: (key: string) => key,
  }),
}));

describe('pages/Staking/Overview/AboutStaking', () => {
  test('should create component', () => {
    render(<AboutStaking />);

    const text = screen.getByText('staking.overview.aboutStakingLabel');
    expect(text).toBeInTheDocument();
  });
});
