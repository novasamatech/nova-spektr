import { type BaseModalElements } from './BaseModalElements';

export class AssetDetailsModalElements implements BaseModalElements {
  titlePattern = /Details/;
  addressColumn = 'Address';
  holdingsColumn = 'Holdings';
  allocationColumn = 'Asset Allocation';
}
