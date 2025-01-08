import { type Serializable, type StandardVote, TransactionType } from '@/shared/core';
import { TEST_ACCOUNTS, TEST_ADDRESS } from '@/shared/lib/utils';

export const extrinsicTests = [
  {
    testName: 'should create extrinsic for multisig tx and get call data',
    args: {
      callData: '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
      callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
      maybeTimepoint: null,
      otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
      threshold: 2,
    },
    transactionType: TransactionType.MULTISIG_AS_MULTI,
    callData:
      '0x1f0102000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c765001e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe1400000000000000',
  },
  {
    testName: 'should create extrinsic for approve tx and get call data',
    args: {
      callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
      maybeTimepoint: { height: 1, index: 1 },
      otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
      threshold: 2,
      maxWeight: {
        refTime: '64000',
        proofSize: '0',
      },
    },
    transactionType: TransactionType.MULTISIG_APPROVE_AS_MULTI,
    callData:
      '0x1f0202000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c76501010000000100000024f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b802e8030000',
  },
  {
    testName: 'should create extrinsic for cancel tx and get call data',
    args: {
      callHash: '0x24f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
      maybeTimepoint: { height: 1, index: 1 },
      otherSignatories: ['5F3cpq3CLZo77U6g6fHtSbpuhWfdXajs8DnBg9mBPBaPDtMB'],
      threshold: 2,
    },
    transactionType: TransactionType.MULTISIG_CANCEL_AS_MULTI,
    callData:
      '0x1f0302000483e0844510ede3aea6953c9886d9a51abdd944b6395de7b83bbce6dffce0c765010000000100000024f1e9461e13804834b856a6cbc243b56fa4800b9739450ef75230d2290740b8',
  },
  {
    testName: 'should create extrinsic for transfer and get call data',
    args: { dest: 'Evo4vR5tHsTVvNqYZNo4GVQc2xHcB5J8i7gKv4cwXKRynK3', value: '1000000000000' },
    transactionType: TransactionType.TRANSFER,
    callData: '0x04030068161e62bc8d7cf1bef225fd2ed12857889718d97c687256cb4b8794cef1a242070010a5d4e8',
  },
  {
    testName: 'should create extrinsic for add proxy tx and get call data',
    args: {
      delay: '0',
      delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
      proxyType: 'Any',
    },
    transactionType: TransactionType.ADD_PROXY,
    callData: '0x1e0100379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
  },
  {
    testName: 'should create extrinsic for remove proxy tx and get call data',
    args: {
      delay: '0',
      delegate: 'DqEGbAJBJGuDAMN2feH4GsufAYvmYJhNAkiPxs9S4StwJ7j',
      proxyType: 'Any',
    },
    transactionType: TransactionType.REMOVE_PROXY,
    callData: '0x1e0200379b3f5dc547e92c7bf2b9837b8801954b9a68f7deadb3411400511f66adbe140000000000',
  },
  {
    testName: 'should create extrinsic for transfer tx and get call data',
    args: {
      real: TEST_ADDRESS,
      transaction: {
        address: TEST_ADDRESS,
        args: {
          dest: TEST_ADDRESS,
          value: '1000000000000',
        },
        chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
        method: 'transferKeepAlive',
        section: 'balances',
        type: 'transfer',
      },
    },
    transactionType: TransactionType.PROXY,
    callData:
      '0x1e000008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f60140004030008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014070010a5d4e8',
  },
  {
    testName: 'should create extrinsic for bond tx and get call data',
    args: { value: 1000000000000, payee: { Account: TEST_ACCOUNTS[0] } },
    transactionType: TransactionType.BOND,
    callData: '0x0600070010a5d4e80308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
  },
  {
    testName: 'should create extrinsic for payee and get call data',
    args: { payee: { Account: TEST_ACCOUNTS[0] } },
    transactionType: TransactionType.DESTINATION,
    callData: '0x06070308eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
  },
  {
    testName: 'should create extrinsic for stake more tx and get call data',
    args: { maxAdditional: 1000000000000 },
    transactionType: TransactionType.STAKE_MORE,
    callData: '0x0601070010a5d4e8',
  },
  {
    testName: 'should create extrinsic for unstake tx and get call data',
    args: { value: 1000000000000 },
    transactionType: TransactionType.UNSTAKE,
    callData: '0x0602070010a5d4e8',
  },
  {
    testName: 'should create extrinsic for restake tx and get call data',
    args: { value: 1000000000000 },
    transactionType: TransactionType.RESTAKE,
    callData: '0x0613070010a5d4e8',
  },
  {
    testName: 'should create extrinsic for redeem tx and get call data',
    args: { numSlashingSpans: 1 },
    transactionType: TransactionType.REDEEM,
    callData: '0x060301000000',
  },
  {
    testName: 'should create extrinsic for nominate tx and get call data',
    args: { targets: [TEST_ACCOUNTS[0]] },
    transactionType: TransactionType.NOMINATE,
    callData: '0x0605040008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
  },
  {
    testName: 'should create extrinsic for chill tx and get call data',
    args: {},
    transactionType: TransactionType.CHILL,
    callData: '0x0606',
  },
  {
    testName: 'should create extrinsic for batch all tx with unbond and chill and get call data',
    args: {
      transactions: [
        {
          address: TEST_ADDRESS,
          args: {
            value: '1000000000000',
          },
          chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
          method: 'unbond',
          section: 'staking',
          type: TransactionType.UNSTAKE,
        },
        {
          address: TEST_ADDRESS,
          args: {},
          chainId: '0x1234000000000000000000000000000000000000000000000000000000000000',
          method: 'chill',
          section: 'staking',
          type: TransactionType.CHILL,
        },
      ],
    },
    transactionType: TransactionType.BATCH_ALL,
    callData: '0x1802080602070010a5d4e80606',
  },
  {
    testName: 'should create extrinsic for unlock tx and get call data',
    args: {
      class: 1,
      target: TEST_ACCOUNTS[0],
    },
    transactionType: TransactionType.UNLOCK,
    callData: '0x140300000008eb319467ea54784cd9edfbd03bbcc53f7a021ed8d9ed2ca97b6ae46b3f6014',
  },
  {
    testName: 'should create extrinsic to vote tx and get call data',
    args: {
      class: 1,
      vote: {
        type: 'Standard',
        balance: '1000000000000',
        vote: {
          aye: true,
          conviction: 'Locked1x',
        },
      } satisfies Serializable<StandardVote>,
    },
    transactionType: TransactionType.REMOVE_VOTE,
    callData: '0x14040000000000',
  },
  {
    testName: 'should create extrinsic for remove vote tx and get call data',
    args: {
      class: 1,
      index: '123',
    },
    transactionType: TransactionType.REMOVE_VOTE,
    callData: '0x14040000000000',
  },
];
