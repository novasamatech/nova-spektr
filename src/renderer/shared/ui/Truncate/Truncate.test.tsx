import { render, screen } from '@testing-library/react';

import { Truncate } from './Truncate';

describe('ui/Truncate', () => {
  test('should render component', () => {
    // TODO: Find way to set the width for screen and test short value

    const longText =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec interdum tincidunt eleifend. Phasellus suscipit magna a magna sollicitudin posuere. Suspendisse auctor metus sed justo luctus tincidunt. Vivamus a mauris a sapien pulvinar sodales. Sed eget nisl sagittis, pulvinar sem in, ornare nulla. Phasellus pretium diam semper vehicula cursus. Duis dignissim arcu ac blandit lacinia. Sed nisi nisl, vestibulum ut magna nec, pellentesque cursus nulla.';
    const ellipsis = '...';
    render(
      <div style={{ width: '100px' }}>
        <Truncate start={5} end={5} ellipsis={ellipsis} text={longText} />
      </div>,
    );

    const addressValues = screen.getAllByText(longText);
    const ellipsisValue = screen.getByText(ellipsis);

    expect(addressValues).toHaveLength(2);
    expect(ellipsisValue).toBeInTheDocument();
  });
});
