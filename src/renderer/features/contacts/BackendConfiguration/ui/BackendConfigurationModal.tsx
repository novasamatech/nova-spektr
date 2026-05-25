import { useUnit } from 'effector-react';
import { useEffect, useMemo } from 'react';

import { type Chain, SigningType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { useConfirmContext } from '@/shared/providers/ConfirmContext';
import { Alert, Button, FootnoteText, Icon, InputHint, Loader, SmallTitleText } from '@/shared/ui';
import { Address, ChainSelect, Identicon } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, Select, Surface, Tooltip, useNotification } from '@/shared/ui-kit';
import { networkModel } from '@/entities/network';
import { type SignableAccount, authModel, backendConfigurationModel } from '@/aggregates/backend';
import { OperationMessageSign } from '@/features/operations/OperationMessageSign';

const VAULT_SIGNING_TYPES = new Set<SigningType>([SigningType.POLKADOT_VAULT, SigningType.PARITY_SIGNER]);

export const BackendConfigurationModal = () => {
  const { t } = useI18n();
  const { toast } = useNotification();
  const { confirm } = useConfirmContext();

  const isOpen = useUnit(backendConfigurationModel.$isModalOpen);
  const draftUrl = useUnit(backendConfigurationModel.$draftUrl);
  const isValid = useUnit(backendConfigurationModel.$isUrlValid);
  const hasBackend = useUnit(backendConfigurationModel.$hasBackend);
  const isDirty = useUnit(backendConfigurationModel.$isDirty);
  const urlReachable = useUnit(backendConfigurationModel.$urlReachable);

  const isAuthenticated = useUnit(authModel.$isAuthenticated);
  const authState = useUnit(authModel.$authState);
  const authStep = useUnit(authModel.$authStep);
  const selectedAccountId = useUnit(authModel.$selectedAccountId);
  const selectedChainId = useUnit(authModel.$selectedChainId);
  const signableAccounts = useUnit(authModel.$signableAccounts);
  const chainsMap = useUnit(networkModel.$chains);
  const error = useUnit(authModel.$error);
  const isSessionExpired = useUnit(authModel.$isSessionExpired);
  const hasNetworkIssue = useUnit(authModel.$hasNetworkIssue);

  const chainOptions = useMemo(() => Object.values(chainsMap), [chainsMap]);
  const selectedChain = chainsMap[selectedChainId] ?? null;

  const selectedAccount = useMemo(
    () => signableAccounts.find((a) => a.accountId === selectedAccountId) ?? null,
    [signableAccounts, selectedAccountId],
  );
  const showSigningChainSelector =
    selectedAccount !== null && VAULT_SIGNING_TYPES.has(selectedAccount.account.signingType);

  useEffect(() => {
    // eslint-disable-next-line effector/no-watch
    return authModel.events.signInSucceeded.watch(() => {
      toast.success(t('addressBook.auth.connectionSuccess'));
    });
  }, [toast, t]);

  const isSigning = authStep === 'signing';
  const isError = authStep === 'error';
  const showUrlError = draftUrl.trim().length > 0 && !isValid;

  // The cached auth state can survive a server outage — only present the user as "connected"
  // when both background signals agree the backend is currently live: the keepalive hasn't
  // reported a network issue, AND the live reachability probe affirmed reachability. Treating
  // 'checking' / null as not-live closes the brief race between modal-open and probe-completion.
  const isLive = !hasNetworkIssue && urlReachable === 'reachable';
  const urlUnchanged = isAuthenticated && !isDirty && !isSessionExpired && isLive;

  const showAccountSelector = isValid && !urlUnchanged && !isSigning;
  const showConnectedAccount = urlUnchanged && authState && !isSigning;

  const canConnect = isValid && selectedAccountId !== null && !isSigning;

  const title = hasBackend
    ? t('addressBook.backendConfiguration.editTitle')
    : t('addressBook.backendConfiguration.addTitle');

  const handleClose = async () => {
    if (isDirty) {
      const confirmed = await confirm({
        title: t('addressBook.backendConfiguration.unsavedChangesTitle'),
        message: t('addressBook.backendConfiguration.unsavedChangesMessage'),
        confirmText: t('addressBook.backendConfiguration.discardButton'),
        cancelText: t('addressBook.backendConfiguration.keepEditingButton'),
        confirmPallet: 'error',
      });
      if (!confirmed) return;
    }
    backendConfigurationModel.events.modalClosed();
  };

  const handleConnect = () => {
    authModel.events.connectTriggered();
  };

  const handleDelete = () => {
    backendConfigurationModel.events.urlCleared();
    toast.success(t('addressBook.backendConfiguration.backendRemoved'));
  };

  const connectButtonText = isError
    ? t('addressBook.backendConfiguration.tryAgainButton')
    : t('addressBook.backendConfiguration.connectButton');

  return (
    <Modal isOpen={isOpen} size="sm" onToggle={(open) => !open && handleClose()}>
      <Modal.Title close>{title}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5, 2, 5]} gap={4}>
          <Field
            text={
              <span className="flex items-center gap-x-1">
                {t('addressBook.backendConfiguration.urlLabel')}
                <a
                  href="https://docs.novaspektr.io/address-book/external-contact-management"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="text-text-tertiary hover:text-primary-button-background-default"
                >
                  <Icon name="info" size={12} className="text-inherit" />
                </a>
              </span>
            }
          >
            <Input
              name="backendUrl"
              placeholder={t('addressBook.backendConfiguration.urlPlaceholder')}
              invalid={showUrlError}
              disabled={isSigning}
              value={draftUrl}
              onChange={backendConfigurationModel.events.urlChanged}
            />
            <InputHint variant="error" active={showUrlError}>
              {t('addressBook.backendConfiguration.urlInvalidError')}
            </InputHint>
            {urlReachable && <UrlReachabilityStatus status={urlReachable} />}
          </Field>

          {showConnectedAccount && (
            <Field text={t('addressBook.auth.connectedAccountLabel')}>
              <Surface className="flex items-center justify-between gap-2">
                <Address
                  address={toAddress(authState.accountId)}
                  title={authState.accountName}
                  variant="truncate"
                  showIcon
                  iconSize={20}
                />
                <Button variant="text" size="sm" onClick={() => authModel.events.signOutClicked()}>
                  {t('addressBook.auth.disconnectButton')}
                </Button>
              </Surface>
            </Field>
          )}

          {isSigning && (
            <>
              {showSigningChainSelector && (
                <ChainSelectorField
                  value={selectedChain}
                  options={chainOptions}
                  onSelect={(chain) => authModel.events.chainSelected(chain.chainId)}
                />
              )}
              <OperationMessageSign onGoBack={() => authModel.events.signingCancelled()} />
            </>
          )}

          {showAccountSelector && (
            <AccountSelector
              accounts={signableAccounts}
              selectedAccountId={selectedAccountId}
              onSelect={(id) => authModel.events.accountSelected(id)}
            />
          )}

          <Alert active={isError} title={t('addressBook.auth.errorTitle')} variant="error">
            {error && <Alert.Item withDot={false}>{error}</Alert.Item>}
          </Alert>
        </Box>
      </Modal.Content>
      {!isSigning && (hasBackend || !urlUnchanged) && (
        <Modal.Footer align="between">
          <div className="-ml-2">
            {hasBackend && (
              <Button variant="text" onClick={handleDelete}>
                {t('addressBook.actions.delete')}
              </Button>
            )}
          </div>
          {!urlUnchanged && (
            <Button disabled={!canConnect} onClick={handleConnect}>
              {connectButtonText}
            </Button>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
};

const urlReachabilityConfig = {
  checking: { icon: <Loader color="primary" size={14} />, textClass: 'text-text-tertiary' },
  reachable: {
    icon: <Icon name="checkmarkOutline" size={14} className="text-icon-positive" />,
    textClass: 'text-icon-positive',
  },
  unreachable: {
    icon: <Icon name="warnCutout" size={14} className="text-icon-negative" />,
    textClass: 'text-icon-negative',
  },
  wrongBackend: {
    icon: <Icon name="warnCutout" size={14} className="text-icon-negative" />,
    textClass: 'text-icon-negative',
  },
} as const;

const UrlReachabilityStatus = ({ status }: { status: 'checking' | 'reachable' | 'unreachable' | 'wrongBackend' }) => {
  const { t } = useI18n();
  const { icon, textClass } = urlReachabilityConfig[status];

  return (
    <div className="flex items-center gap-x-1.5">
      {icon}
      <FootnoteText className={textClass}>{t(`addressBook.backendConfiguration.${status}`)}</FootnoteText>
    </div>
  );
};

const AccountSelector = ({
  accounts,
  selectedAccountId,
  onSelect,
}: {
  accounts: SignableAccount[];
  selectedAccountId: AccountId | null;
  onSelect: (id: AccountId) => void;
}) => {
  const { t } = useI18n();

  if (accounts.length === 0) {
    return (
      <Field text={t('addressBook.auth.selectAccountLabel')}>
        <FootnoteText className="text-text-tertiary">{t('addressBook.auth.noSignableAccounts')}</FootnoteText>
      </Field>
    );
  }

  return (
    <Field text={t('addressBook.auth.selectAccountLabel')}>
      <Select
        placeholder={t('addressBook.auth.selectAccountPlaceholder')}
        value={selectedAccountId}
        onChange={(value) => onSelect(value as AccountId)}
      >
        {accounts.map((account) => (
          <Select.Item key={account.accountId} value={account.accountId}>
            <Box direction="row" gap={2} verticalAlign="center">
              <Identicon address={toAddress(account.accountId)} size={20} />
              <SmallTitleText>{account.name}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">
                {account.walletName} · {toShortAddress(toAddress(account.accountId))}
              </FootnoteText>
            </Box>
          </Select.Item>
        ))}
      </Select>
    </Field>
  );
};

const ChainSelectorField = ({
  value,
  options,
  onSelect,
}: {
  value: Chain | null;
  options: Chain[];
  onSelect: (chain: Chain) => void;
}) => {
  const { t } = useI18n();

  return (
    <Field
      text={
        <span className="flex items-center gap-x-1">
          {t('addressBook.auth.selectChainLabel')}
          <Tooltip>
            <Tooltip.Trigger>
              <span tabIndex={0} className="text-text-tertiary hover:text-primary-button-background-default">
                <Icon name="info" size={12} className="text-inherit" />
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('addressBook.auth.chainHintTooltip')}</Tooltip.Content>
          </Tooltip>
        </span>
      }
    >
      <ChainSelect
        value={value}
        options={options}
        placeholder={t('addressBook.auth.selectChainPlaceholder')}
        onChange={onSelect}
      />
    </Field>
  );
};
