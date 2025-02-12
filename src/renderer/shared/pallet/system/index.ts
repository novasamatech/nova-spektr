import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const systemPallet = {
  consts,
  schema,
  storage,
};

export type {
  SystemLimitsBlockLength,
  SupportDispatchPerDispatchClassU32,
  SpWeightsWeightV2Weight,
  SupportDispatchPerDispatchClassWeightsPerClass,
  SystemLimitsBlockWeights,
  SystemLimitsWeightsPerClass,
} from './schema';
