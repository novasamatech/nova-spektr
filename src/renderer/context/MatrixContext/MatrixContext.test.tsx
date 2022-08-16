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
      init: jest.fn(),
      loginFromCache: jest.fn(),
      setupSubscribers: jest.fn(),
      stopClient: jest.fn(),
    }));

    await act(async () => {
      render(<MatrixProvider onAutoLoginFail={() => {}}>children</MatrixProvider>);
    });

    expect(screen.getByText('children')).toBeInTheDocument();
  });

  test('should setup subscribers after login', async () => {
    const setupSubscribers = jest.fn();
    const loginFailSpy = jest.fn();

    (Matrix as jest.Mock).mockImplementation(() => ({
      init: jest.fn(),
      loginFromCache: jest.fn(),
      stopClient: jest.fn(),
      setupSubscribers,
    }));

    await act(async () => {
      render(<MatrixProvider onAutoLoginFail={loginFailSpy}>children</MatrixProvider>);
    });

    expect(setupSubscribers).toBeCalled();
  });

  test('should handle call onAutoLoginFail', async () => {
    const loginFailSpy = jest.fn();

    (Matrix as jest.Mock).mockReturnValue({
      stopClient: jest.fn(),
      init: jest.fn(() => {
        throw new Error('fail');
      }),
    });

    await act(async () => {
      render(<MatrixProvider onAutoLoginFail={loginFailSpy}>children</MatrixProvider>);
    });

    expect(loginFailSpy).toBeCalledTimes(1);
    expect(loginFailSpy).toBeCalledWith('fail');
  });
});
