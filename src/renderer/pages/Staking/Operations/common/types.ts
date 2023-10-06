import { Address } from '@renderer/shared/core';
import { RewardsDestination } from '@renderer/shared/core/types/stake';

export type DestinationType = {
  address?: Address;
  type: RewardsDestination;
};
