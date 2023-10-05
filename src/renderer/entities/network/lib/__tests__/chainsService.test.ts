import { chainsService } from '../chainsService';
import { Chain } from '@renderer/entities/chain';
import { fakeBalance, getChain, fakePrice } from './TestHelpers';

describe('service/chainsService', () => {
  let polkadot: Chain = getChain('Polkadot');
  let kusama: Chain = getChain('Kusama');
  let threeDPass: Chain = getChain('3DPass');
  let westend: Chain = getChain('Westend');
  let acala: Chain = getChain('Acala');
  let ajuna: Chain = getChain('Ajuna');
  let bifrostKusama: Chain = getChain('Bifrost Kusama');
  let litmus: Chain = getChain('Litmus')
  let kusamaAssetHub: Chain = getChain('Kusama Asset Hub')
  let polkadotAssetHub: Chain = getChain('Polkadot Asset Hub')

  test('should init', () => {
    expect(chainsService.sortChains).toBeDefined();
    expect(chainsService.sortChainsByBalance).toBeDefined();
    expect(chainsService.getChainsData).toBeDefined();
    expect(chainsService.getStakingChainsData).toBeDefined();
  });

  test.each([
    [
      'Polkadot => Kusama => Parachains => TestNets',
      [westend, polkadot, threeDPass, acala, kusama],
      [polkadot, kusama, acala, threeDPass, westend],
    ],
    [
      'Polkadot => Kusama => Testnets',
      [westend, kusama, polkadot],
      [polkadot, kusama, westend],
    ],
    [
      'Polkadot => Kusama => Parachains',
      [acala, kusama, polkadot],
      [polkadot, kusama, acala],
    ],
    [
      'Polkadot => Parachains',
      [polkadot, litmus, acala],
      [polkadot, acala, litmus],
    ],
    [
      'Acala => 3DPass',
      [threeDPass, acala],
      [acala, threeDPass],
    ]
  ])('should sort chains without prices - %s', (
    _, notSortedChains, expectedOrder
  ) => {
    const sortedChains = chainsService.sortChains(notSortedChains);
    expect(sortedChains.map(chain => chain.name)).toEqual(expectedOrder.map(chain => chain.name));
  });
  
  test.each([
    [
      'Polkadot 100$ => Kusama 10$',
      [polkadot, kusama],
      [fakeBalance(polkadot, 'DOT', '100'),fakeBalance(kusama, 'KSM', '10')],
      fakePrice({'DOT': 1, 'KSM': 1}, [polkadot, kusama]),
      [polkadot, kusama],
    ],
    [
      'Kusama 100$ => Polkadot 10$',
      [polkadot, kusama],
      [fakeBalance(polkadot, 'DOT', '10'),fakeBalance(kusama, 'KSM', '100')],
      fakePrice({'DOT': 1, 'KSM': 1}, [polkadot, kusama]),
      [kusama, polkadot],
    ],
    [
      'Polkadot 10$ => Kusama 10$',
      [kusama, polkadot],
      [fakeBalance(polkadot, 'DOT', '10'),fakeBalance(kusama, 'KSM', '10')],
      fakePrice({'DOT': 1, 'KSM': 1}, [polkadot, kusama]),
      [polkadot, kusama],
    ],
  ])('Dotsama group with balances - %s', (
    _, notSortedChains, balances, prices, expectedOrder
  ) => {

    const sortedChains = chainsService.sortChainsByBalance(
      notSortedChains,
      balances,
      prices,
      'usd',
    );
  
    expect(sortedChains.map(chain => chain.name)).toEqual(expectedOrder.map(chain => chain.name));
  });

  test.each([
    [
      'Bifrost Kusama BNC 100$ => Ajuna AJUN 10$',
      [ajuna, bifrostKusama, threeDPass],
      [fakeBalance(ajuna, 'AJUN', '100'),fakeBalance(bifrostKusama, 'BNC', '10')],
      fakePrice({'AJUN': 1, 'BNC': 1}, [ajuna, bifrostKusama]),
      [bifrostKusama, ajuna, threeDPass],
    ],
    [
      'Ajuna AJUN 100$ => Bifrost Kusama BNC 10$',
      [threeDPass, ajuna, bifrostKusama],
      [fakeBalance(ajuna, 'AJUN', '100'),fakeBalance(bifrostKusama, 'BNC', '10')],
      fakePrice({'AJUN': 1, 'BNC': 1}, [ajuna, bifrostKusama]),
      [ajuna, bifrostKusama, threeDPass],
    ],
    [
      'Bifrost Kusama BNC 0.1$ => Ajuna AJUN 0.01$',
      [threeDPass, ajuna, bifrostKusama],
      [fakeBalance(ajuna, 'AJUN', '1'),fakeBalance(bifrostKusama, 'BNC', '1')],
      fakePrice({'AJUN': 0.01, 'BNC': 0.1}, [ajuna, bifrostKusama]),
      [bifrostKusama, ajuna, threeDPass],
    ],
    [
      'Bifrost Kusama BNC 0.1$ => Kusama Asset Hub KSM 0$',
      [threeDPass, bifrostKusama, kusamaAssetHub],
      [fakeBalance(kusamaAssetHub, 'KSM', '1'),fakeBalance(bifrostKusama, 'BNC', '1')],
      fakePrice({'KSM': 0, 'BNC': 0.1}, [kusamaAssetHub, bifrostKusama]),
      [bifrostKusama, kusamaAssetHub, threeDPass],
    ],
    [
      'Bifrost Kusama BNC 1$ => Polkadot Asset Hub DOT 0.1$',
      [threeDPass, bifrostKusama, polkadotAssetHub],
      [fakeBalance(polkadotAssetHub, 'DOT', '1'),fakeBalance(bifrostKusama, 'BNC', '1')],
      fakePrice({'DOT': 0.1, 'BNC': 1}, [polkadotAssetHub, bifrostKusama]),
      [bifrostKusama, polkadotAssetHub, threeDPass],
    ],
    [
      'Litmus LIT 1$ => Ajuna AJUN 0.1$ => Bifrost Kusama BNC 0.1$',
      [litmus, ajuna, bifrostKusama],
      [fakeBalance(litmus, 'LIT', '1'),fakeBalance(ajuna, 'AJUN', '1'),fakeBalance(bifrostKusama, 'BNC', '1')],
      fakePrice({'AJUN': 0.1, 'BNC': 0.1, 'LIT': 1}, [litmus, ajuna, bifrostKusama]),
      [litmus, ajuna, bifrostKusama],
    ],
  ])('Production networks group with balances - %s', (
    _, notSortedChains, balances, prices, expectedOrder
  ) => {

    const sortedChains = chainsService.sortChainsByBalance(
      notSortedChains,
      balances,
      prices,
      'usd',
    );
  
    expect(sortedChains.map(chain => chain.name)).toEqual(expectedOrder.map(chain => chain.name));
  });
});
