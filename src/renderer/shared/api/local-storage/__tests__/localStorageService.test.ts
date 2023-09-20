import { localStorageService } from '../service/localStorageService';

// TODO: complete
describe('shared/api/local-storage/localStorageService', () => {
  test('', () => {
    localStorageService.saveToStorage('wqe', 'qwe');

    expect(1).toEqual(1);
  });
});
