import { Address } from '@renderer/domain/shared-kernel';
import { RewardsDestination } from '@renderer/domain/stake';

export type DestinationType = {
  address?: Address;
  type: RewardsDestination;
};
