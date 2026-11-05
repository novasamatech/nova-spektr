import { describe, expect, it } from 'vitest';

import { getRewardsScan } from '../rewards-scan';

describe('features/dashboard-staking-kpi/lib/rewards-scan', () => {
  it('is complete when every network answered in full', () => {
    expect(
      getRewardsScan([
        { chainName: 'Polkadot Asset Hub', completeness: 'complete' },
        { chainName: 'Kusama Asset Hub', completeness: 'complete' },
      ]),
    ).toEqual({ completeness: 'complete', incompleteNetworks: [], pending: false });
  });

  it('is partial and names the network when one of them did not answer in full', () => {
    expect(
      getRewardsScan([
        { chainName: 'Polkadot Asset Hub', completeness: 'complete' },
        { chainName: 'Kusama Asset Hub', completeness: 'partial' },
      ]),
    ).toEqual({ completeness: 'partial', incompleteNetworks: ['Kusama Asset Hub'], pending: false });
  });

  it('is partial when one network could not be loaded at all and another answered', () => {
    expect(
      getRewardsScan([
        { chainName: 'Polkadot Asset Hub', completeness: 'unavailable' },
        { chainName: 'Kusama Asset Hub', completeness: 'complete' },
      ]),
    ).toEqual({ completeness: 'partial', incompleteNetworks: ['Polkadot Asset Hub'], pending: false });
  });

  it('is unavailable when no network could be loaded', () => {
    expect(
      getRewardsScan([
        { chainName: 'Polkadot Asset Hub', completeness: 'unavailable' },
        { chainName: 'Kusama Asset Hub', completeness: 'unavailable' },
      ]),
    ).toEqual({
      completeness: 'unavailable',
      incompleteNetworks: ['Polkadot Asset Hub', 'Kusama Asset Hub'],
      pending: false,
    });
  });

  it('is pending while a network has not answered yet', () => {
    expect(
      getRewardsScan([
        { chainName: 'Polkadot Asset Hub', completeness: 'complete' },
        { chainName: 'Kusama Asset Hub', completeness: undefined },
      ]).pending,
    ).toBe(true);
  });

  it('is pending before any network has answered', () => {
    expect(getRewardsScan([{ chainName: 'Polkadot Asset Hub', completeness: undefined }]).pending).toBe(true);
  });
});
