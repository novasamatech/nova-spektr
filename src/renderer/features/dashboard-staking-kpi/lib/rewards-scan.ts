import { type DataCompleteness, combineCompleteness } from '@/domains/staking';

/**
 * How far the reward-window figure can be trusted as a whole, and which
 * networks hold it back.
 */
export type RewardsScan = {
  completeness: DataCompleteness;
  /** Names of the networks whose window did not answer in full. */
  incompleteNetworks: string[];
  /**
   * A network has not answered yet. The figure is then not a figure at all —
   * neither a total nor a lower bound — and is shown as loading.
   */
  pending: boolean;
};

type NetworkAnswer = {
  chainName: string;
  /** `undefined` — the window of this network has not answered yet. */
  completeness: DataCompleteness | undefined;
};

/**
 * The figure is a sum over networks, so it is only as complete as the least
 * complete of them: one network that could not be read in full turns the total
 * into a lower bound, and when none could be read there is no total at all.
 *
 * A network still in flight holds the whole figure in its loading state: a sum
 * without it would read as a total (`$0` before anything arrived).
 */
export function getRewardsScan(networks: NetworkAnswer[]): RewardsScan {
  const answered: DataCompleteness[] = [];
  const incompleteNetworks: string[] = [];
  let pending = false;

  for (const { chainName, completeness } of networks) {
    if (completeness === undefined) {
      pending = true;
      continue;
    }

    answered.push(completeness);
    if (completeness !== 'complete') {
      incompleteNetworks.push(chainName);
    }
  }

  return { completeness: combineCompleteness(answered), incompleteNetworks, pending };
}
