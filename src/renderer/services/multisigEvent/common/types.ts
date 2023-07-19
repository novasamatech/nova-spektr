import { AccountId, CallHash, ChainId } from '@renderer/domain/shared-kernel';
import { MultisigEvent, MultisigTransactionKey } from '@renderer/domain/transaction';
import { ID, MultisigEventDS } from '@renderer/services/storage';

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
  addEventWithQueue: (event: MultisigEvent) => void;
  updateEvent: (event: MultisigEventDS) => Promise<ID>;
  deleteEvent: (eventId: ID) => Promise<void>;
}
