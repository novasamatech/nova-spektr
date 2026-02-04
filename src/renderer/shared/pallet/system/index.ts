import { consts } from './consts';
import * as schema from './schema';
import { storage } from './storage';

export const systemPallet = {
  consts,
  schema,
  storage,
};

export type {
  SpWeightsWeightV2Weight,
  SupportDispatchPerDispatchClassU32,
  SupportDispatchPerDispatchClassWeightsPerClass,
  SystemLimitsBlockLength,
  SystemLimitsBlockWeights,
  SystemLimitsWeightsPerClass,
} from './schema';
