export const TEST_IDS = {
  LOGIN: {
    FORM: 'login-form',
    USERNAME_INPUT: 'login-username-input',
    PASSWORD_INPUT: 'login-password-input',
    SUBMIT_BUTTON: 'login-submit-button',
  },
  ONBOARDING: {
    VAULT_BUTTON: 'onboarding-vault-button',
    NOVA_WALLET_BUTTON: 'onboarding-nova-wallet-button',
    WALLET_CONNECT_BUTTON: 'onboarding-wallet-connect-button',
    WATCH_ONLY_BUTTON: 'onboarding-watch-only-button',
    LEDGER_BUTTON: 'onboarding-ledger-button',
    ACCESS_DENIED_TEXT: 'onboarding-access-denied-text',
    WALLET_NAME_INPUT: 'onboarding-wallet-name-input',
    WALLET_ADDRESS_INPUT: 'onboarding-wallet-address-input',
  },
  ASSETS: {
    PAGE_CONTAINER: 'assets-page-container',
    SETTINGS_WIDGET: 'assets-settings-widget',
    ZERO_BALANCE_TOGGLE: 'assets-zero-balance-toggle',
    TOKEN_CENTRIC_VIEW: 'assets-token-centric-view',
  },
  MAIN: {
    WALLET_BUTTON: 'main-wallet-button',
    BACK_BUTTON: 'main-back-button',
    CONTINUE_BUTTON: 'main-continue-button',
    INFO_BUTTON: 'main-info-button',
  },
  TRANSFER: {
    CONFIRM: {
      NETWORK_FEE: 'transfer-confirm-network-fee',
    },
    ESTIMATE_FEE: 'transfer-estimate-fee',
  },
} as const;
