import { Address } from '@shared/core';
import { RewardsDestination } from '@shared/core/types/stake';

export type DestinationType = {
  address?: Address;
  type: RewardsDestination;
};
