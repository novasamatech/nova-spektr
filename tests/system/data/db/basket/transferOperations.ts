import { IndexedDBData } from '../../../utils/interactWithDatabase';
import { BasketTransaction, TransactionType } from '../../../../../src/renderer/shared/core';

export function createTransferOperations(initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transactions: BasketTransaction[] = [
    {
      id: 1,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.TRANSFER,
        args: {
          dest: '5CFPcUJgYgWryPaV1aYjSbTpbTLu42V32Ytw1L9rfoMAsfGh',
          value: '100000000000',
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 2,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.XCM_TELEPORT,
        args: {
          dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
          value: '100000000000',
          destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
          xcmFee: '15836598',
          xcmAsset: {
            V4: [
              {
                id: {
                  Concrete: {
                    parents: 0,
                    interior: 'Here',
                  },
                },
                fun: {
                  Fungible: {
                    negative: 0,
                    words: [23629238, 1490],
                    length: 2,
                    red: null,
                  },
                },
              },
            ],
          },
          xcmWeight: '4000000000',
          xcmDest: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: 1000,
                },
              },
            },
          },
          xcmBeneficiary: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  accountId32: {
                    network: 'Any',
                    id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                  },
                },
              },
            },
          },
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 3,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.XCM_LIMITED_TRANSFER,
        args: {
          dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
          value: '100000000000',
          destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
          xcmFee: '15836598',
          xcmAsset: {
            V4: [
              {
                id: {
                  Concrete: {
                    parents: 0,
                    interior: 'Here',
                  },
                },
                fun: {
                  Fungible: {
                    negative: 0,
                    words: [23629238, 1490],
                    length: 2,
                    red: null,
                  },
                },
              },
            ],
          },
          xcmWeight: '4000000000',
          xcmDest: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: 1000,
                },
              },
            },
          },
          xcmBeneficiary: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  accountId32: {
                    network: 'Any',
                    id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                  },
                },
              },
            },
          },
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 4,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.POLKADOT_XCM_LIMITED_TRANSFER,
        args: {
          dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
          value: '100000000000',
          destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
          xcmFee: '15836598',
          xcmAsset: {
            V4: [
              {
                id: {
                  Concrete: {
                    parents: 0,
                    interior: 'Here',
                  },
                },
                fun: {
                  Fungible: {
                    negative: 0,
                    words: [23629238, 1490],
                    length: 2,
                    red: null,
                  },
                },
              },
            ],
          },
          xcmWeight: '4000000000',
          xcmDest: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: 1000,
                },
              },
            },
          },
          xcmBeneficiary: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  accountId32: {
                    network: 'Any',
                    id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                  },
                },
              },
            },
          },
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 5,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.POLKADOT_XCM_TELEPORT,
        args: {
          dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
          value: '100000000000',
          destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
          xcmFee: '15836598',
          xcmAsset: {
            V4: [
              {
                id: {
                  Concrete: {
                    parents: 0,
                    interior: 'Here',
                  },
                },
                fun: {
                  Fungible: {
                    negative: 0,
                    words: [23629238, 1490],
                    length: 2,
                    red: null,
                  },
                },
              },
            ],
          },
          xcmWeight: '4000000000',
          xcmDest: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: 1000,
                },
              },
            },
          },
          xcmBeneficiary: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  accountId32: {
                    network: 'Any',
                    id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                  },
                },
              },
            },
          },
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
    {
      id: 6,
      initiatorWallet,
      coreTx: {
        chainId,
        address,
        type: TransactionType.XTOKENS_TRANSFER_MULTIASSET,
        args: {
          dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
          value: '100000000000',
          destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
          xcmFee: '15836598',
          xcmAsset: {
            V4: [
              {
                id: {
                  Concrete: {
                    parents: 0,
                    interior: 'Here',
                  },
                },
                fun: {
                  Fungible: {
                    negative: 0,
                    words: [23629238, 1490],
                    length: 2,
                    red: null,
                  },
                },
              },
            ],
          },
          xcmWeight: '4000000000',
          xcmDest: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  Parachain: 1000,
                },
              },
            },
          },
          xcmBeneficiary: {
            V4: {
              parents: 0,
              interior: {
                X1: {
                  accountId32: {
                    network: 'Any',
                    id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                  },
                },
              },
            },
          },
        },
      },
      txWrappers: [],
      groupId: undefined,
    },
  ];

  const injectingData = transactions.map((tx) => ({
    initiatorWallet: tx.initiatorWallet,
    coreTx: tx.coreTx,
    txWrappers: tx.txWrappers,
    groupId: tx.groupId,
    id: tx.id,
  }));

  return {
    database: 'spektr',
    table: 'basketTransactions',
    injectingData,
  };
}

export function createNumberOfTransfers(numberOfTransfers: number, initiatorWallet: number, address: string, chainId: string): IndexedDBData {
  const transferTemplate: BasketTransaction = {
    id: 1,
    initiatorWallet,
    coreTx: {
      chainId,
      address,
      type: TransactionType.XCM_TELEPORT,
      args: {
        dest: 'Cm1GneZB3Xnj3PvnHMnLYppk3d8rhJDUvjgPzRp9bZfcimH',
        value: '100000000000',
        destinationChain: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
        xcmFee: '15836598',
        xcmAsset: {
          V4: [
            {
              id: {
                Concrete: {
                  parents: 0,
                  interior: 'Here',
                },
              },
              fun: {
                Fungible: {
                  negative: 0,
                  words: [23629238, 1490],
                  length: 2,
                  red: null,
                },
              },
            },
          ],
        },
        xcmWeight: '4000000000',
        xcmDest: {
          V4: {
            parents: 0,
            interior: {
              X1: {
                Parachain: 1000,
              },
            },
          },
        },
        xcmBeneficiary: {
          V4: {
            parents: 0,
            interior: {
              X1: {
                accountId32: {
                  network: 'Any',
                  id: '0x08264834504a64ace1373f0c8ed5d57381ddf54a2f67a318fa42b1352681606d',
                },
              },
            },
          },
        },
      },
    },
    txWrappers: [],
    groupId: undefined,
  }

  const injectingData = Array.from({ length: numberOfTransfers }, (_, index) => ({
    ...transferTemplate,
    id: index + 1,
  }));

  return {
    database: 'spektr',
    table: 'basketTransactions',
    injectingData,
  };
}