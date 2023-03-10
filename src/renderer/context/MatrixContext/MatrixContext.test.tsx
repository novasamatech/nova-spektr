import { act, render, screen } from '@testing-library/react';

import Matrix from '@renderer/services/matrix';
import { MatrixProvider } from './MatrixContext';

jest.mock('@renderer/services/matrix', () => jest.fn().mockReturnValue({}));

describe('context/MatrixContext', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should render children', async () => {
    (Matrix as jest.Mock).mockImplementation(() => ({
      loginFromCache: jest.fn().mockResolvedValue({}),
      setupSubscribers: jest.fn(),
      stopClient: jest.fn(),
    }));

    await act(async () => {
      render(<MatrixProvider>children</MatrixProvider>);
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('should setup subscribers after login', async () => {
    const setupSubscribers = jest.fn();

    (Matrix as jest.Mock).mockImplementation(() => ({
      loginFromCache: jest.fn().mockResolvedValue({}),
      stopClient: jest.fn(),
      setupSubscribers,
    }));

    await act(async () => {
      render(<MatrixProvider>children</MatrixProvider>);
    });

    expect(setupSubscribers).toBeCalled();
  });
});
