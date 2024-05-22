import { ID, MultisigEventDS } from '@shared/api/storage';
import { AccountId, CallHash, ChainId, MultisigEvent, MultisigTransactionKey, SigningStatus } from '@shared/core';

export interface IMultisigEventService {
  getEvent: (eventId: ID) => Promise<MultisigEventDS | undefined>;
  getEvents: <T extends MultisigEvent>(where?: Partial<T>) => Promise<MultisigEventDS[]>;
  getLiveEvents: <T extends MultisigEvent>(where?: Partial<T>) => MultisigEventDS[];
  getLiveTxEvents: <T extends MultisigEvent>(
    txAccountId: AccountId,
    txChainId: ChainId,
    txCallHash: CallHash,
    txBlock: number,
    txIndex: number,
    where?: Partial<T>,
  ) => MultisigEventDS[];
  getEventsByKeys: (keys: MultisigTransactionKey[]) => Promise<MultisigEventDS[]>;
  getLiveEventsByKeys: (keys: MultisigTransactionKey[]) => MultisigEventDS[];
  addEvent: (event: MultisigEvent) => Promise<ID>;
  addEventWithQueue: (event: MultisigEvent, pendingStatuses?: SigningStatus[]) => void;
  updateEvent: (event: MultisigEventDS) => Promise<ID>;
  deleteEvent: (eventId: ID) => Promise<void>;
}
