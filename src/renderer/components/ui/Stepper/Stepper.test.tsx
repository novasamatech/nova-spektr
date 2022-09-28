import { render, screen } from '@testing-library/react';

import Stepper from './Stepper';

describe('ui/Stepper', () => {
  test('should render correct steps', () => {
    const steps = [{ title: 'Step_1' }, { title: 'Step_2' }];

    render(<Stepper steps={steps} active={0} />);

    const active = screen.getByTestId('active-step');
    const inactive = screen.getByTestId('inactive-step');
    expect(active).toBeInTheDocument();
    expect(inactive).toBeInTheDocument();
  });

  test('should render fully complete stepper', () => {
    const steps = [{ title: 'Step_1' }, { title: 'Step_2' }, { title: 'Step_3' }];

    render(<Stepper steps={steps} active={3} />);

    const complete = screen.getAllByTestId('complete-step');
    expect(complete).toHaveLength(3);
  });

  test('should update step', () => {
    const steps = [{ title: 'Step_1' }, { title: 'Step_2' }];

    const { rerender } = render(<Stepper steps={steps} active={0} />);

    let complete = screen.queryByTestId('complete-step');
    let active = screen.getByTestId('active-step');
    let inactive = screen.queryByTestId('inactive-step');
    expect(complete).not.toBeInTheDocument();
    expect(active).toBeInTheDocument();
    expect(inactive).toBeInTheDocument();

    rerender(<Stepper steps={steps} active={1} />);

    complete = screen.getByTestId('active-step');
    active = screen.getByTestId('active-step');
    inactive = screen.queryByTestId('inactive-step');
    expect(complete).toBeInTheDocument();
    expect(active).toBeInTheDocument();
    expect(inactive).not.toBeInTheDocument();
  });
});
