import { TEST_IDS } from '@/shared/constants';

export class ConfirmationModalElements {
  // Sign/confirm button is matched by a stable test id: its visible label varies by
  // wallet type ("Sign", "Sign with Nova Wallet", …) and the substring "Sign" also
  // collides with the multi-hop "Signing path" chip, breaking role-by-name lookups.
  static confirmButton = TEST_IDS.OPERATIONS.SIGN_BUTTON;
  static cancelButton = 'Cancel';
  static addToBasketButton = 'Basket';
}
