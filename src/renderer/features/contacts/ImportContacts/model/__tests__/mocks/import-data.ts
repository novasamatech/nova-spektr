// Real test data from Polkadot.js exported contacts

export const VALID_CONTACTS = [
  {
    address: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
    name: 'Alice',
    isFavorite: false,
  },
  {
    address: '14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3',
    name: 'Bob',
    isFavorite: false,
  },
  {
    address: '1zugcavYA9yCuYwiEYeMHNJm9gXznYjNfXQjZsZukF1Mpow',
    name: 'Charlie',
    isFavorite: false,
  },
];

export const SIMILAR_NAMES = [
  {
    address: '5DLT36mQf4zfyKF7qcLwM4ZRkk57eVM7PKj5tc9qp3ZMbay9',
    name: 'first',
    isFavorite: false,
  },
  {
    address: '5G8u9kERczMNrLc42LMPJ4d4r1QzXin5tCDpVEDLxHpC918P',
    name: 'first',
    isFavorite: false,
  },
  {
    address: '5HpDPCzZRU1QB9tAMBEGzkvfJVmnjan6yCDgPKf1Q5vN9awr',
    name: 'first',
    isFavorite: false,
  },
];

export const ONLY_NAME_AND_ADDRESS = [
  {
    address: '16SDAKg9N6kKAbhgDyxBXdHEwpwHUHs2CNEiLNGeZV55qHna',
    name: 'gav',
  },
];

export const ADDITIONAL_PARAMS = [
  {
    address: '16SDAKg9N6kKAbhgDyxBXdHEwpwHUHs2CNEiLNGeZV55qHna',
    isFavorite: false,
    name: 'gav',
    metadata: {
      name: 'Stepan',
    },
  },
];

export const MISSING_NAME = [
  {
    address: '16SDAKg9N6kKAbhgDyxBXdHEwpwHUHs2CNEiLNGeZV55qHna',
  },
];

export const EMPTY_ARRAY: never[] = [];

export const INVALID_JSON = 'not a json';

export const NOT_ARRAY = {
  address: '15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5',
  name: 'Alice',
};
