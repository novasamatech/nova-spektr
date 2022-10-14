import { ISubscriptionService } from '../common/types';
import { useSubscription } from '../subscriptionService';

jest.mock('react', () => {
  const originReact = jest.requireActual('react');
  const mUseRef = jest.fn();

  return {
    ...originReact,
    useRef: mUseRef,
  };
});

describe('service/subscription/subscriptionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should init subscription service', async () => {
    const { subscribe, unsubscribe, unsubscribeAll, hasSubscription } = useSubscription();

    expect(subscribe).toBeDefined();
    expect(unsubscribe).toBeDefined();
    expect(unsubscribeAll).toBeDefined();
    expect(hasSubscription).toBeDefined();
  });
});
