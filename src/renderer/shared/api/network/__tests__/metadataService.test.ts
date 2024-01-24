import { metadataService } from '../service/metadataService';
import { ApiPromise } from '@polkadot/api';

describe('shared/api/network/services/metadataService', () => {
  test('should return UnsubscribePromise on subscribeMetadata', () => {
    const apiMock = {} as ApiPromise;
    // let value = 1;

    metadataService.subscribeMetadata(apiMock, () => console.log(1));
  });
});
