import { type SigningMode } from '@/features/validator-selection';
import { type PositionAccess } from '../lib';

/**
 * The picker knows three outcomes, this widget knows four ways in.
 *
 * `direct` and `multisig` both end in a signature produced here, so both are
 * `local`; the picker learns who signs from the initiator it is handed, not
 * from this flag.
 *
 * `blocked` should never reach a flow — the chip that would have dispatched it
 * is disabled — so it maps to the most restrictive mode there is rather than to
 * a guess. A read-only picker is the right failure for a row that should not
 * have been actionable in the first place.
 */
export function toSigningMode(access: PositionAccess): SigningMode {
  switch (access.mode) {
    case 'blocked':
      return 'watchOnly';
    case 'draft':
      return 'draft';
    default:
      return 'local';
  }
}
