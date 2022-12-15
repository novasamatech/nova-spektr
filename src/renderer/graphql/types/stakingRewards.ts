export type RewardsQuery = {
  accumulatedRewards: {
    nodes: {
      id: string;
      amount: string;

      __typename: string;
    }[];

    __typename: string;
  };
};
