import { type AccountId } from '@/shared/polkadotjs-schemas';
import { AssetHubChains } from '../../constants';
import { mapEraValidatorsToLegacy } from '../helpers';
import { type EraValidator, type EraValidatorMap } from '../types';

const alice = '0x01' as AccountId;
const bob = '0x02' as AccountId;

function makeEraValidator(accountId: AccountId): EraValidator {
  return {
    accountId,
    totalStake: '1000',
    ownStake: '100',
    commission: 5,
    blocked: false,
    nominatorCount: 3,
    pageCount: 1,
    maxNominatorsRewarded: 512,
    slashed: false,
    eraPoints: 40,
    apy: 15,
    elected: true,
  };
}

describe('mapEraValidatorsToLegacy', () => {
  const eraValidators: EraValidatorMap = {
    [alice]: makeEraValidator(alice),
    [bob]: makeEraValidator(bob),
  };

  it('should reuse the same result for the same map and chain', () => {
    const first = mapEraValidatorsToLegacy(eraValidators, AssetHubChains.POLKADOT_AH);
    const second = mapEraValidatorsToLegacy(eraValidators, AssetHubChains.POLKADOT_AH);

    expect(second).toBe(first);
  });

  it('should not leak the chain of the first call into the second one', () => {
    const polkadot = mapEraValidatorsToLegacy(eraValidators, AssetHubChains.POLKADOT_AH);
    const kusama = mapEraValidatorsToLegacy(eraValidators, AssetHubChains.KUSAMA_AH);

    expect(kusama).not.toBe(polkadot);
    expect(polkadot[alice]?.chainId).toEqual(AssetHubChains.POLKADOT_AH);
    expect(polkadot[bob]?.chainId).toEqual(AssetHubChains.POLKADOT_AH);
    expect(kusama[alice]?.chainId).toEqual(AssetHubChains.KUSAMA_AH);
    expect(kusama[bob]?.chainId).toEqual(AssetHubChains.KUSAMA_AH);
  });

  it('should keep the earlier chain result stable after mapping another chain', () => {
    const polkadot = mapEraValidatorsToLegacy(eraValidators, AssetHubChains.POLKADOT_AH);
    mapEraValidatorsToLegacy(eraValidators, AssetHubChains.KUSAMA_AH);

    expect(mapEraValidatorsToLegacy(eraValidators, AssetHubChains.POLKADOT_AH)).toBe(polkadot);
  });
});
