import { fiatService } from '../service/fiatService';
import { localStorageService } from '@shared/api/local-storage';
import { CURRENCY_CODE_KEY, FIAT_FLAG_KEY, PRICE_PROVIDER_KEY, ASSETS_PRICES_KEY } from '../common/constants';

describe('shared/api/price-provider/services/fiatService', () => {
  const spyGetFn = (value: any) => jest.spyOn(localStorageService, 'getFromStorage').mockReturnValue(value);
  const spySaveFn = () => jest.spyOn(localStorageService, 'saveToStorage').mockImplementation();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getActiveCurrencyCode should return value', () => {
    const spyGet = spyGetFn('usd');

    const defaultValue = 'code';
    fiatService.getActiveCurrencyCode(defaultValue);
    expect(spyGet).toHaveBeenCalledWith(CURRENCY_CODE_KEY, defaultValue);
    expect(spyGet).toReturnWith('usd');
  });

  test('saveActiveCurrencyCode should save value', () => {
    const spySave = spySaveFn();

    const value = 'usd';
    fiatService.saveActiveCurrencyCode(value);
    expect(spySave).toHaveBeenCalledWith(CURRENCY_CODE_KEY, value);
  });

  test('getFiatFlag should return value', () => {
    const spyGet = spyGetFn(true);

    const defaultValue = false;
    fiatService.getFiatFlag(defaultValue);
    expect(spyGet).toHaveBeenCalledWith(FIAT_FLAG_KEY, defaultValue);
    expect(spyGet).toReturnWith(true);
  });

  test('saveFiatFlag should save value', () => {
    const spyGet = spySaveFn();

    const value = false;
    fiatService.saveFiatFlag(value);
    expect(spyGet).toHaveBeenCalledWith(FIAT_FLAG_KEY, value);
  });

  test('getPriceProvider should return value', () => {
    const spyGet = spyGetFn('coingeko');

    const defaultValue = 'coinbase';
    fiatService.getPriceProvider(defaultValue);
    expect(spyGet).toHaveBeenCalledWith(PRICE_PROVIDER_KEY, defaultValue);
    expect(spyGet).toReturnWith('coingeko');
  });

  test('saveFiatProvider should save value', () => {
    const spyGet = spySaveFn();

    const value = 'coinbase';
    fiatService.savePriceProvider(value);
    expect(spyGet).toHaveBeenCalledWith(PRICE_PROVIDER_KEY, value);
  });

  test('getAssetsPrices should return value', () => {
    const spyGet = spyGetFn({ acala: '100' });

    const defaultValue = { polkadot: '200' };
    fiatService.getAssetsPrices(defaultValue);
    expect(spyGet).toHaveBeenCalledWith(ASSETS_PRICES_KEY, defaultValue);
    expect(spyGet).toReturnWith({ acala: '100' });
  });

  test('saveAssetsPrices should save value', () => {
    const spyGet = spySaveFn();

    const value = { polkadot: '200' };
    fiatService.saveAssetsPrices(value);
    expect(spyGet).toHaveBeenCalledWith(ASSETS_PRICES_KEY, value);
  });
});
