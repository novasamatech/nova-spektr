import { operationsDomainModel } from './model/operations/model';
import { operationsService } from './model/operations/service';

export const multisigDomain = {
  operations: operationsDomainModel,

  operationsService,
};

export type { MultisigOperation, MultisigEvent } from './model/operations/types';
