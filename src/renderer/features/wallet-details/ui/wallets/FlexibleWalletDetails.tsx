import { useGate, useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type FlexibleMultisigWallet, type MultisigWallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { assert, isEthereumAccountId, nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, HeadlineText, Icon, IconButton, Separator } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';
import { AccountExplorers, Address, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { type AnyAccount, accountService, accounts } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { ContactItem, WalletCardMd, accountUtils, permissionUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { multisigWalletDetailsModel } from '../../model/multisig-wallet-details';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { WalletFiatBalance } from '../components';
import { ProxiesList } from '../components/ProxiesList';
import { type WalletAction, WalletActions } from '../components/WalletActions';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  models: { addPureProxied },
  views: { AddPureProxied },
} = proxyAddPureFeature;

type Props = {
  wallet: MultisigWallet | FlexibleMultisigWallet;
  onClose: () => void;
};

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

export const FlexibleWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(multisigWalletDetailsModel.flow, { wallet });
  useGate(walletDetailsModel.flow, { wallet });

  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(multisigWalletDetailsModel.$hasProxies);
  const signatories = useUnit(multisigWalletDetailsModel.$signatories);
  const accountList = useUnit(accounts.$list);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();
  const [tab, setTab] = useState('1');

  const walletAccounts = accountService.filterAccountsByWallet(accountList, wallet.id);
  const multisigAccount = walletAccounts.find(accountUtils.isFlexibleMultisigAccount);
  const proxiedAccount = walletAccounts.find(accountUtils.isFlexibleProxiedAccount);

  assert(multisigAccount, 'Multisig account not found.');
  assert(proxiedAccount, 'Proxied account not found.');

  const chain = chains[proxiedAccount.chainId];

  const canCreateProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const nonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

    return (anyProxy || nonAnyProxy) && networkUtils.isProxySupported(chain?.options);
  }, [chain]);

  const canCreatePureProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    return anyProxy && networkUtils.isPureProxySupported(chain?.options);
  }, [chain]);

  const actions: WalletAction[] = [
    // todo uncomment when implemented
    // {
    //   icon: 'changeSignatories' as IconNames,
    //   title: t('walletDetails.multisig.changeSignatories'),
    //   onClick: () => {},
    // },
  ];

  if (canCreateProxy) {
    actions.push({
      icon: 'delegate' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  if (canCreatePureProxy) {
    actions.push({
      icon: 'createPureProxy' as IconNames,
      title: t('walletDetails.common.addPureProxiedAction'),
      onClick: addPureProxied.events.flowStarted,
    });
  }

  actions.push({
    icon: 'forget' as IconNames,
    title: t('walletDetails.common.hideButton'),
    variant: 'danger',
    onClick: toggleConfirmForget,
  });

  const TabItems: { id: string; title: string; panel: ReactNode }[] = [];

  const TabAccount = {
    id: '1',
    title: t('walletDetails.multisig.accountTab'),
    panel: (
      <div>
        <div className="flex flex-col gap-y-3 px-5">
          <FootnoteText className="text-text-tertiary"></FootnoteText>

          <div className="-mx-2">
            {proxiedAccount ? (
              <ContactItem address={proxiedAccount.accountId} addressPrefix={chain.addressPrefix}>
                <AccountExplorers accountId={proxiedAccount.accountId} chain={chain} />
              </ContactItem>
            ) : (
              <BodyText>{t('walletDetails.multisig.addressInProgress')}</BodyText>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-y-2 px-5">
          <FootnoteText className="text-text-tertiary">
            {t('walletDetails.multisig.signatoriesGroup', { amount: multisigAccount.signatories.length })}
          </FootnoteText>

          <ul className="flex flex-col gap-y-2">
            {signatories.wallets.map(([wallet, accountId]) => (
              <li key={accountId} className="-mx-2">
                <WalletCardMd
                  wallet={wallet}
                  description={
                    <div className="text-help-text text-text-tertiary">
                      <Address address={toAddress(accountId, { prefix: chain.addressPrefix })} />
                    </div>
                  }
                >
                  <AccountExplorers accountId={accountId} chain={chain} />
                </WalletCardMd>
              </li>
            ))}
            {signatories.contacts.map(signatory => (
              <li key={signatory.accountId} className="-mx-2">
                <ContactItem name={signatory.name} address={signatory.accountId} addressPrefix={chain.addressPrefix}>
                  <AccountExplorers accountId={signatory.accountId} chain={chain} />
                </ContactItem>
              </li>
            ))}
            {signatories.people.map(accountId => (
              <li key={accountId} className="-mx-2">
                <ContactItem address={accountId} addressPrefix={chain.addressPrefix}>
                  <AccountExplorers accountId={accountId} chain={chain} />
                </ContactItem>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  };
  TabItems.push(TabAccount);

  if (canCreateProxy) {
    const TabProxy = {
      id: '3',
      title: t('walletDetails.common.proxiesTabTitle'),
      panel: (
        <ProxiesList
          wallet={wallet}
          hasProxies={hasProxies}
          canCreateProxy={canCreateProxy}
          onAddProxy={addProxy.events.flowStarted}
        />
      ),
    };

    TabItems.push(TabProxy);
  }

  return (
    <>
      <Modal size="mdlg" height="full" isOpen onToggle={open => !open && onClose()}>
        <Modal.Title close>{t('walletDetails.common.title')}</Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-6 flex flex-col gap-y-2.5 px-5">
            <Box direction="row" verticalAlign="center">
              <Box direction="row" verticalAlign="center" gap={2}>
                <div className="mr-1">
                  <WalletAccountIcon
                    address={multisigAccount?.accountId}
                    type={wallet.type}
                    size={42}
                    theme={isEthereumAccountId(multisigAccount?.accountId) ? 'ethereum' : 'polkadot'}
                  />
                </div>
                {!isRenameModalOpen && (
                  <>
                    <HeadlineText className="truncate text-text-primary" as="h3">
                      {wallet.name}
                    </HeadlineText>
                    <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                      <IconButton name="rename" size={16} onClick={toggleIsRenameModalOpen} />
                      <WalletFiatBalance />
                    </div>
                  </>
                )}
              </Box>

              <RenameWallet wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

              {multisigAccount && !isRenameModalOpen && (
                <div className="ml-auto shrink-0 duration-300 animate-in fade-in-0">
                  <Slot id={overviewSlot} props={{ walletAccounts: [multisigAccount] }} />
                </div>
              )}
            </Box>
            {nonNullable(chain) && (
              <div className="flex items-center pl-4">
                <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
                <div className="flex items-center text-footnote">
                  <Trans
                    t={t}
                    i18nKey="walletDetails.multisig.singleChainTitle"
                    components={{
                      chain: (
                        <ChainTitle className="mx-1 gap-x-1" fontClass="text-text-primary" chainId={chain.chainId} />
                      ),
                    }}
                    values={{
                      threshold: multisigAccount.threshold,
                      signatories: multisigAccount.signatories.length,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <WalletActions actions={actions} />

          <Separator className="my-6" />
        </Modal.HeaderContent>
        <Modal.Content disableScroll>
          <Tabs value={tab} onChange={setTab}>
            <Box padding={[0, 5]}>
              <Tabs.List>
                {TabItems.map(({ id, title }) => (
                  <Tabs.Trigger key={id} value={id}>
                    {title}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Box>
            {TabItems.map(({ id, panel }) => (
              <Tabs.Content key={id} value={id}>
                <ScrollArea>
                  <Box padding={[4, 0]}>{panel}</Box>
                </ScrollArea>
              </Tabs.Content>
            ))}
          </Tabs>
        </Modal.Content>
      </Modal>

      <RenameWallet wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
    </>
  );
};
