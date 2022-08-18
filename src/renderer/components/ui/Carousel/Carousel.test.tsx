import { render, screen } from '@testing-library/react';

import Carousel from './Carousel';

describe('ui/Carousel', () => {
  const slides = [<div>slide 1</div>, <div>slide 2</div>];

  test('should render component', () => {
    render(<Carousel slides={slides} />);

    const slideEl = screen.getAllByText(/slide \d/);
    expect(slideEl).toHaveLength(2);
  });

  test('should render controls', () => {
    render(<Carousel slides={slides} />);

    const prevBtn = screen.getByRole('button', { name: /left.svg/ });
    const nextBtn = screen.getByRole('button', { name: /right.svg/ });
    const dots = screen.getAllByRole('button', { name: /^$/ });
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
    expect(dots).toHaveLength(2);
  });
});
