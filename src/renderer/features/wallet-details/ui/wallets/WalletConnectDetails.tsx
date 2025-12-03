import { useGate, useUnit } from 'effector-react';
import { useState, useTransition } from 'react';

import { type WalletConnectGroup } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useModalClose, useToggle } from '@/shared/lib/hooks';
import { isEthereumAccountId, isPolkadotChain, toAddress } from '@/shared/lib/utils';
import {
  Button,
  ConfirmModal,
  FootnoteText,
  HeadlineText,
  IconButton,
  Separator,
  SmallTitleText,
  StatusLabel,
  StatusModal,
} from '@/shared/ui';
import { Animation } from '@/shared/ui/Animation/Animation';
import { type IdenticonIconTheme, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts, useWalletName } from '@/domains/network';
import { permissionUtils } from '@/entities/wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { AddProxy } from '@/features/proxy-add';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { ForgetStep } from '../../lib/constants';
import { walletDetailsUtils, wcDetailsUtils } from '../../lib/utils';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { walletConnectForget } from '../../model/walletConnectForgot';
import { walletConnectReconnect } from '../../model/walletConnectReconnect';
import { WalletFiatBalance } from '../components';
import { ProxiesCount } from '../components/ProxiesCount';
import { ProxiesList } from '../components/ProxiesList';
import { Action, type WalletAction, WalletActions } from '../components/WalletActions';
import { WalletConnectAccounts } from '../components/WalletConnectAccounts';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

type Props = {
  wallet: WalletConnectGroup;
  onClose: () => void;
};
export const WalletConnectDetails = ({ wallet, onClose }: Props) => {
  useGate(walletConnectForget.flow, { accounts: wallet.accounts });
  useGate(walletConnectReconnect.flow, { accounts: wallet.accounts });
  useGate(walletDetailsModel.flow, { wallet });
  useGate(walletProxiesModel.flow, { wallet });

  const { t } = useI18n();
  const walletName = useWalletName(wallet);

  const hasProxies = useUnit(walletProxiesModel.$hasWalletProxies);
  const connected = useUnit(walletConnectReconnect.$connected);
  const forgetStep = useUnit(walletConnectForget.$forgetStep);
  const reconnectStep = useUnit(walletConnectReconnect.$reconnectStep);
  const canCreateProxy = useUnit(walletDetailsModel.$canCreateProxy);
  const proxiesCount = useUnit(walletProxiesModel.$walletProxiesCount);
  const accountList = useUnit(accounts.$list);

  const [_, startTransition] = useTransition();

  const [tab, setTab] = useState('accounts');
  const [isModalOpen, closeModal] = useModalClose(true, onClose);
  const [isConfirmReconnectOpen, toggleConfirmReconnect] = useToggle();
  const [isRenameInputOpen, toggleIsRenameInputOpen] = useToggle();

  const handleForgetWallet = () => {
    walletConnectForget.forget(wallet);
    onClose();
  };

  const actions: WalletAction[] = [];

  if (permissionUtils.canCreateAnyProxy(wallet) || permissionUtils.canCreateNonAnyProxy(wallet)) {
    actions.push({
      component: (
        <AddProxy wallet={wallet}>
          <Action title={t('walletDetails.common.addProxyAction')} icon="delegate" />
        </AddProxy>
      ),
    });
  }

  if (permissionUtils.canCreateAnyProxy(wallet)) {
    actions.push({
      component: (
        <AddPureProxied wallet={wallet}>
          <Action title={t('walletDetails.common.addPureProxiedAction')} icon="createPureProxy" />
        </AddPureProxied>
      ),
    });
  }

  actions.push({
    component: (
      <ForgetWalletConfirm wallet={wallet} onForget={handleForgetWallet}>
        <Action title={t('walletDetails.common.forgetButton')} icon="forget" variant="danger" />
      </ForgetWalletConfirm>
    ),
  });

  const ActionButton = <IconButton name="refresh" size={16} onClick={() => walletConnectReconnect.start()} />;

  const changeTab = (tab: string) => {
    startTransition(() => {
      setTab(tab);
    });
  };

  const walletAccounts = accountService.filterAccountsByWallet(accountList, wallet.id);
  const mainAccount =
    walletAccounts.find(account => accountService.isChainAccount(account) && isPolkadotChain(account.chainId)) ||
    walletAccounts.at(0);
  const accountId = mainAccount?.accountId;

  const isEthereum = isEthereumAccountId(accountId);
  const theme: IdenticonIconTheme = isEthereum ? 'ethereum' : 'polkadot';

  return (
    <>
      <Modal size="mdlg" height="full" isOpen={isModalOpen} onToggle={closeModal}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-4 flex justify-between px-5 pt-4 pb-6">
            <Box direction="row" verticalAlign="center" gap={2}>
              <div className="mr-1">
                <WalletAccountIcon
                  address={accountId && toAddress(accountId)}
                  type={wallet.type}
                  size={42}
                  theme={theme}
                />
              </div>
              {!isRenameInputOpen && (
                <>
                  <HeadlineText className="ml-1 truncate text-text-primary" as="h3">
                    {walletName}
                  </HeadlineText>
                  <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                    <StatusLabel variant={connected ? 'success' : 'waiting'} />
                    <IconButton name="rename" size={16} onClick={toggleIsRenameInputOpen} />
                    <WalletFiatBalance />
                  </div>
                </>
              )}
            </Box>

            <RenameWallet wallet={wallet} isOpen={isRenameInputOpen} onClose={toggleIsRenameInputOpen} />

            {!isRenameInputOpen && (
              <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
                <Slot id={overviewSlot} props={{ walletAccounts: wallet.accounts }} />
              </div>
            )}
          </div>

          <WalletActions actions={actions} />

          <Separator className="my-6" />
        </Modal.HeaderContent>
        <Modal.Content disableScroll>
          <Tabs value={tab} onChange={changeTab}>
            <div className="px-5">
              <Tabs.List>
                <Tabs.Trigger value="accounts">
                  <span className="flex items-center gap-1">
                    {t('walletDetails.common.accountTabTitle')}
                    <span className="text-text-tertiary">{wallet.accounts.length}</span>
                  </span>
                </Tabs.Trigger>
                <Tabs.Trigger value="proxies">
                  <span className="flex items-center gap-1">
                    {t('walletDetails.common.proxiesTabTitle')}
                    <ProxiesCount count={proxiesCount} />
                  </span>
                </Tabs.Trigger>
              </Tabs.List>
            </div>
            <Tabs.Content value="accounts">
              <WalletConnectAccounts wallet={wallet} />
            </Tabs.Content>
            <Tabs.Content value="proxies">
              <ScrollArea>
                <ProxiesList wallet={wallet} hasProxies={hasProxies} canCreateProxy={canCreateProxy} />
              </ScrollArea>
            </Tabs.Content>
          </Tabs>
        </Modal.Content>
      </Modal>

      <ConfirmModal
        panelClass="w-[300px]"
        isOpen={isConfirmReconnectOpen}
        confirmText={t('walletDetails.walletConnect.confirmButton')}
        cancelText={t('walletDetails.common.cancelButton')}
        onConfirm={() => {
          toggleConfirmReconnect();
          walletConnectReconnect.start();
        }}
        onClose={() => {
          toggleConfirmReconnect();
          walletConnectReconnect.abort();
        }}
      >
        <SmallTitleText className="mb-2" align="center">
          {t('walletDetails.walletConnect.reconnectConfirmTitle')}
        </SmallTitleText>
        <FootnoteText className="text-text-tertiary" align="center">
          {t('walletDetails.walletConnect.reconnectConfirmDescription')}
        </FootnoteText>
      </ConfirmModal>

      <StatusModal
        isOpen={walletDetailsUtils.isForgetModalOpen(forgetStep)}
        title={t(
          forgetStep === ForgetStep.FORGETTING
            ? 'walletDetails.common.removingWallet'
            : 'walletDetails.common.walletRemoved',
        )}
        content={
          forgetStep === ForgetStep.FORGETTING ? <Animation variant="loading" loop /> : <Animation variant="success" />
        }
        onClose={walletConnectForget.abort}
      />

      <StatusModal
        isOpen={wcDetailsUtils.isRejected(reconnectStep)}
        title={t('walletDetails.walletConnect.rejectTitle')}
        description={t('walletDetails.walletConnect.rejectDescription')}
        content={<Animation variant="error" />}
        onClose={walletConnectReconnect.abort}
      >
        <Button onClick={() => walletConnectReconnect.abort()}>
          {t('walletDetails.walletConnect.abortRejectButton')}
        </Button>
      </StatusModal>
    </>
  );
};
