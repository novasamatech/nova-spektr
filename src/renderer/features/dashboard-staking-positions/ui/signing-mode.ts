import { type SigningMode } from '@/features/validator-selection';
import { type PositionAccessMode } from '../lib';

/**
 * The picker knows three outcomes, this widget knows four ways in.
 *
 * `direct` and `multisig` both end in a signature produced here, so both are
 * `local`; the picker learns who signs from the initiator it is handed, not
 * from this flag.
 */
export function toSigningMode(mode: PositionAccessMode): SigningMode {
  switch (mode) {
    case 'watchOnly':
      return 'watchOnly';
    case 'draft':
      return 'draft';
    default:
      return 'local';
  }
}
