import { Address } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/entities/staking/model/stake';

export type DestinationType = {
  address?: Address;
  type: RewardsDestination;
};
