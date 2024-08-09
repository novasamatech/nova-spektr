import {
  type Args,
  type BaseTxInfo,
  type OptionsWithMeta,
  type UnsignedTransaction,
  defineMethod,
} from '@substrate/txwrapper-polkadot';

import { type TransactionVote } from '../../../governance';

interface UnlockArgs extends Args {
  /**
   * Class: The class of polls to unlock. - trackId.
   */
  class: number;
  /**
   * Target: The account to remove the lock on. - address.
   */
  target: string;
}

const unlock = (args: UnlockArgs, info: BaseTxInfo, options: OptionsWithMeta): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'unlock',
        pallet: 'convictionVoting',
      },
      ...info,
    },
    options,
  );

interface VoteArgs extends Args {
  /**
   * PollIndex: referendum id
   */
  pollIndex: number;

  /**
   * Name: unknown
   */
  name: string;

  /**
   * Vote: describes vote to submit.
   */
  vote: TransactionVote;
}

const vote = (args: VoteArgs, info: BaseTxInfo, options: OptionsWithMeta): UnsignedTransaction => {
  return defineMethod(
    {
      method: {
        args,
        name: 'vote',
        pallet: 'convictionVoting',
      },
      ...info,
    },
    options,
  );
};

interface RemoveVoteArgs extends Args {
  /**
   * Class: Optional parameter, if given it indicates the class of the poll. For
   * polls which have finished or are cancelled, this must be Some. - trackId.
   */
  class: number;
  /**
   * Index: The index of poll of the vote to be removed. - referendumId.
   */
  index: string;
}

const removeVote = (args: RemoveVoteArgs, info: BaseTxInfo, options: OptionsWithMeta): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'removeVote',
        pallet: 'convictionVoting',
      },
      ...info,
    },
    options,
  );

type DelegateArgs = {
  /**
   * Class: The class of polls to delegate. - trackId.
   */
  class: number;
  /**
   * To: The account to which the voting power is delegated.
   *
   * - Address.
   */
  to: string;
  /**
   * Conviction: The conviction with which the voting power is delegated -
   * conviction.
   */
  conviction: number;
  /**
   * Balance: The amount of balance delegated. - string.
   */
  balance: string;
};

const delegate = (args: DelegateArgs, info: BaseTxInfo, options: OptionsWithMeta): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'delegate',
        pallet: 'convictionVoting',
      },
      ...info,
    },
    options,
  );

type UndelegateArgs = {
  /**
   * Class: The class of polls to undelegate. - trackId.
   */
  class: number;
};

const undelegate = (args: UndelegateArgs, info: BaseTxInfo, options: OptionsWithMeta): UnsignedTransaction =>
  defineMethod(
    {
      method: {
        args,
        name: 'undelegate',
        pallet: 'convictionVoting',
      },
      ...info,
    },
    options,
  );

export const convictionVotingMethods = {
  unlock,
  vote,
  removeVote,
  delegate,
  undelegate,
};
