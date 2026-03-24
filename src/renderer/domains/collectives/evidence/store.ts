import { $ipfsGateways, $primaryIpfsGateway } from './ipfsGateway';
import {
  evidenceContentResource,
  evidencePeriodResource,
  evidenceResource,
  evidenceSummaryResource,
  evidenceToReferendumRelationsResource,
} from './resource';

export const evidence = {
  evidenceResource,
  evidenceContentResource,
  evidencePeriodResource,
  evidenceSummaryResource,
  evidenceToReferendumRelationsResource,
  $ipfsGateways,
  $primaryIpfsGateway,
};
