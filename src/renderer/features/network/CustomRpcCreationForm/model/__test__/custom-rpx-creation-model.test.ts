import { fork, allSettled } from 'effector';

import { customRpcCreationModel } from '../custom-rpc-creation-model';

describe('features/network/CustomRpcCreationForm/custom-rpc-creation-model', () => {
  test('should have errors for wrong node url', async () => {
    const scope = fork({
      // values: new Map().set(priceProviderModel.$fiatFlag, false).set(currencyModel.$currencyConfig, config),
    });

    const { name, url } = customRpcCreationModel.$customRpcCreationForm.fields;
    await allSettled(name.onChange, { scope, params: 'some name' });
    await allSettled(url.onChange, { scope, params: 'wrong url' });
    await allSettled(customRpcCreationModel.$customRpcCreationForm.submit, { scope });

    console.log('scope.getState(url.$errors)', scope.getState(url.$errors));
    expect(scope.getState(name.$errors)).toEqual([]);
    expect(scope.getState(url.$errors)).toHaveLength(1);
  });

  // test('should filter currencies', () => {
  //   const scope = fork({
  //     values: new Map().set(currencyModel.$currencyConfig, config),
  //   });

  //   const { $cryptoCurrencies, $popularFiatCurrencies, $unpopularFiatCurrencies } = currencyFormModel;

  //   expect(scope.getState($cryptoCurrencies)).toEqual([config[3]]);
  //   expect(scope.getState($popularFiatCurrencies)).toEqual([config[0], config[2]]);
  //   expect(scope.getState($unpopularFiatCurrencies)).toEqual([config[1]]);
  // });

  // test('should set form initial values on formInitiated event', async () => {
  //   const scope = fork({
  //     values: new Map().set(priceProviderModel.$fiatFlag, true).set(currencyModel.$activeCurrency, config[1]),
  //   });

  //   await allSettled(currencyFormModel.events.formInitiated, { scope });

  //   const { fiatFlag, currency } = currencyFormModel.$currencyForm.fields;

  //   expect(scope.getState(fiatFlag.$value)).toEqual(true);
  //   expect(scope.getState(currency.$value)).toEqual(config[1].id);
  // });
});
