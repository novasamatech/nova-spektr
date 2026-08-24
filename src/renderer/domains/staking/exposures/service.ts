import { type ApiPromise } from '@polkadot/api';
import { BN, BN_ZERO } from '@polkadot/util';

import { type EraIndex } from '@/shared/core';
import { stakingPallet } from '@/shared/pallet/staking';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type EraStorage } from '../era-storage';

import { type Exposure, type ExposureMap, type ExposureOverview, type ExposureOverviewMap } from './types';

export const exposureService = {
  getEraOverviews,
  getExposurePages,
};

/**
 * Exposure overviews of every elected validator in the era.
 *
 * A single prefix read over `erasStakersOverview` (~600 entries) - this is the
 * only exposure read that is allowed to scan the whole era.
 */
async function getEraOverviews(api: ApiPromise, era: EraIndex): Promise<ExposureOverviewMap> {
  const entries = await stakingPallet.storage.erasStakersOverview(api, era);

  const result: ExposureOverviewMap = {};
  for (const { validator, overview } of entries) {
    result[validator] = {
      total: overview.total.toString(),
      own: overview.own.toString(),
      nominatorCount: overview.nominatorCount,
      pageCount: overview.pageCount,
    };
  }

  return result;
}

/**
 * Full exposure (overview + flattened nominators) of the given validators.
 *
 * Pages are read per validator and concatenated in page order, so `others`
 * holds every nominator of the validator. Never prefix-read `erasStakersPaged`
 * for a whole era - that is thousands of entries.
 *
 * `overviews` is optional: when the era overviews are already cached they are
 * merged in, otherwise the overview fields are derived from the pages
 * themselves (`own` is not derivable and stays `'0'`).
 *
 * `storage` is where the pages are read from - the resource hands over the
 * chain's memoised era reads, so a validator already read for this era is not
 * read again when the selection widens.
 */
async function getExposurePages(
  api: ApiPromise,
  era: EraIndex,
  validators: AccountId[],
  overviews: ExposureOverviewMap = {},
  storage: Pick<EraStorage, 'erasStakersPaged'> = stakingPallet.storage,
): Promise<ExposureMap> {
  const exposures = await Promise.all(
    validators.map(validator => getValidatorExposure(api, era, validator, overviews[validator], storage)),
  );

  const result: ExposureMap = {};
  for (const [index, validator] of validators.entries()) {
    const exposure = exposures[index];
    if (exposure) {
      result[validator] = exposure;
    }
  }

  return result;
}

async function getValidatorExposure(
  api: ApiPromise,
  era: EraIndex,
  validator: AccountId,
  overview: ExposureOverview | undefined,
  storage: Pick<EraStorage, 'erasStakersPaged'>,
): Promise<Exposure> {
  const pages = await storage.erasStakersPaged(api, era, validator);
  const sortedPages = [...pages].sort((a, b) => a.page - b.page);

  const others = sortedPages.flatMap(({ exposure }) =>
    exposure.others.map(({ who, value }) => ({ who, value: value.toString() })),
  );

  const pagesTotal = sortedPages.reduce<BN>((acc, { exposure }) => acc.add(new BN(exposure.pageTotal)), BN_ZERO);

  return {
    total: overview?.total ?? pagesTotal.toString(),
    own: overview?.own ?? '0',
    nominatorCount: overview?.nominatorCount ?? others.length,
    pageCount: overview?.pageCount ?? sortedPages.length,
    others,
  };
}
