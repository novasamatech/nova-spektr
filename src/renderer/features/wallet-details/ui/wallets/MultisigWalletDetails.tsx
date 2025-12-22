import { useGate, useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';

import { type FlexibleMultisigWallet, type MultisigWallet } from '@/shared/core';
import { Slot, createSlot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { assert, isEthereumAccountId, toAccountId, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HeadlineText, IconButton, Separator } from '@/shared/ui';
import { Address, ChainAccountsList, RootExplorers, WalletAccountIcon } from '@/shared/ui-entities';
import { Box, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { accountService, accounts, useWalletName } from '@/domains/network';
import { type AnyAccount } from '@/domains/network';
import { contactModel } from '@/entities/contact';
import { networkModel, networkUtils } from '@/entities/network';
import { ContactItem, WalletCardMd, accountUtils, permissionUtils, walletModel } from '@/entities/wallet';
import { AddPureProxied } from '@/features/proxied-add-pure';
import { AddProxy } from '@/features/proxy-add';
import { ForgetWalletConfirm } from '@/features/wallets/ForgetWallet';
import { RenameWallet } from '@/features/wallets/RenameWallet';
import { walletDetailsUtils } from '../../lib/utils';
import { multisigWalletDetailsModel } from '../../model/multisig-wallet-details';
import { walletDetailsModel } from '../../model/wallet-details-model';
import { walletProxiesModel } from '../../model/wallet-proxies-model';
import { WalletFiatBalance } from '../components';
import { ProxiesCount } from '../components/ProxiesCount';
import { ProxiesList } from '../components/ProxiesList';
import { Action, type WalletAction, WalletActions } from '../components/WalletActions';

export const overviewSlot = createSlot<{ walletAccounts: AnyAccount[] }>();

type Props = {
  wallet: MultisigWallet | FlexibleMultisigWallet;
  onClose: () => void;
};
export const MultisigWalletDetails = ({ wallet, onClose }: Props) => {
  const { t } = useI18n();
  const walletName = useWalletName(wallet);

  useGate(multisigWalletDetailsModel.flow, { wallet });
  useGate(walletDetailsModel.flow, { wallet });
  useGate(walletProxiesModel.flow, { wallet });

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(multisigWalletDetailsModel.$hasProxies);
  const signatories = useUnit(multisigWalletDetailsModel.$signatories);
  const contacts = useUnit(contactModel.$contacts);
  const walletsList = useUnit(walletModel.$wallets);

  const accountList = useUnit(accounts.$list);
  const proxiesCount = useUnit(walletProxiesModel.$walletProxiesCount);

  const [isRenameInputOpen, toggleIsRenameInputOpen] = useToggle();
  const [tab, setTab] = useState('1');

  const walletAccounts = accountService.filterAccountsByWallet(accountList, wallet.id);
  const multisigAccount = walletAccounts.find(accountUtils.isMultisigAccount);
  assert(multisigAccount, 'Multisig account not found.');

  const getSignatoryName = (accountId: AccountId) => {
    return walletDetailsUtils.getSignatoryName(accountId, multisigAccount.signatories, contacts, walletsList);
  };

  // Check for deprecated multichain multisig accounts
  const multisigChains = useMemo(() => {
    return Object.values(chains).filter(chain => {
      const isMultisigSupported = networkUtils.isMultisigSupported(chain.options);
      const isChainAndCryptoMatch = accountService.isAccountAvailableOnChain(multisigAccount, chain);

      return isMultisigSupported && isChainAndCryptoMatch;
    });
  }, [chains]);

  const canCreateProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const nonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);
    return (anyProxy || nonAnyProxy) && multisigChains.some(c => networkUtils.isProxySupported(c.options));
  }, [multisigChains]);

  const canCreatePureProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    return anyProxy && multisigChains.some(c => networkUtils.isPureProxySupported(c.options));
  }, [multisigChains]);

  const actions: WalletAction[] = [];

  if (canCreateProxy) {
    actions.push({
      component: (
        <AddProxy wallet={wallet}>
          <Action title={t('walletDetails.common.addProxyAction')} icon="delegate" />
        </AddProxy>
      ),
    });
  }

  if (canCreatePureProxy) {
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
      <ForgetWalletConfirm wallet={wallet} onForget={onClose}>
        <Action title={t('walletDetails.common.hideButton')} icon="eyeSlashed" variant="danger" />
      </ForgetWalletConfirm>
    ),
  });

  const TabItems: { id: string; title: ReactNode; panel: ReactNode }[] = [];

  const multisigAccounts = multisigChains.map(chain => [chain, multisigAccount.accountId] as const);

  const TabAccountList = {
    id: '1',
    title: (
      <span className="flex items-center gap-1">
        {t('walletDetails.multisig.accountsTab')}
        <span className="text-text-tertiary">{multisigAccounts.length}</span>
      </span>
    ),
    panel: <ChainAccountsList accounts={multisigAccounts} />,
  };

  const TabSignatories = {
    id: '2',
    title: (
      <span className="flex items-center gap-1">
        {t('walletDetails.multisig.signatoriesTab')}
        <span className="text-text-tertiary">{multisigAccount.signatories.length}</span>
      </span>
    ),
    panel: (
      <ScrollArea>
        <div className="flex flex-col gap-2">
          <FootnoteText className="px-5 text-text-tertiary">
            {t('walletDetails.multisig.thresholdLabel', {
              min: multisigAccount.threshold,
              max: multisigAccount.signatories.length,
            })}
          </FootnoteText>

          <div className="flex flex-col gap-2">
            {signatories.wallets.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <FootnoteText className="px-5 text-text-tertiary">
                  {t('walletDetails.multisig.walletsGroup')} {signatories.wallets.length}
                </FootnoteText>

                <ul className="flex flex-col gap-y-2 px-5">
                  {signatories.wallets.map(([wallet, accountId]) => (
                    <li key={accountId} className="-mx-2">
                      <WalletCardMd
                        wallet={wallet}
                        description={
                          <div className="text-help-text text-text-tertiary">
                            <Address address={toAddress(accountId)} />
                          </div>
                        }
                      >
                        <RootExplorers accountId={accountId} />
                      </WalletCardMd>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {signatories.contacts.length > 0 && (
              <div className="px-5">
                <FootnoteText className="text-text-tertiary">
                  {t('walletDetails.multisig.contactsGroup')} {signatories.contacts.length}
                </FootnoteText>

                <ul className="flex flex-col gap-y-2">
                  {signatories.contacts.map(signatory => (
                    <li key={signatory.accountId} className="-mx-2">
                      <ContactItem name={signatory.name} address={signatory.accountId}>
                        <RootExplorers accountId={signatory.accountId} />
                      </ContactItem>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {signatories.people.length > 0 && (
              <div className="flex flex-col gap-2">
                <FootnoteText className="px-5 text-text-tertiary">
                  {t('walletDetails.multisig.otherSignatories', { count: signatories.people.length })}
                </FootnoteText>

                <ul className="flex flex-col gap-y-2 text-footnote text-text-secondary">
                  {signatories.people.map(accountId => (
                    <li key={accountId} className="px-3">
                      <ContactItem address={accountId} name={getSignatoryName(toAccountId(accountId))}>
                        <RootExplorers accountId={accountId} />
                      </ContactItem>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    ),
  };

  TabItems.push(TabAccountList);
  TabItems.push(TabSignatories);

  if (canCreateProxy) {
    const TabProxy = {
      id: '3',
      title: (
        <span className="flex items-center gap-1">
          {t('walletDetails.common.proxiesTabTitleShort')}
          <ProxiesCount count={proxiesCount} />
        </span>
      ),
      panel: <ProxiesList wallet={wallet} hasProxies={hasProxies} canCreateProxy={canCreateProxy} />,
    };

    TabItems.push(TabProxy);
  }

  return (
    <Modal size="mdlg" height="full" isOpen onToggle={open => !open && onClose()}>
      <Modal.Title close> {t('walletDetails.common.title')}</Modal.Title>
      <Modal.HeaderContent>
        <div className="mb-6 flex justify-between px-5">
          <Box direction="row" verticalAlign="center" gap={2}>
            <div className="mr-1">
              <WalletAccountIcon
                address={multisigAccount?.accountId && toAddress(multisigAccount?.accountId)}
                type={wallet.type}
                size={42}
                theme={isEthereumAccountId(multisigAccount?.accountId) ? 'ethereum' : 'polkadot'}
              />
            </div>
            {!isRenameInputOpen && (
              <>
                <HeadlineText className="ml-1 truncate text-text-primary" as="h3">
                  {walletName}
                </HeadlineText>
                <div className="flex shrink-0 items-center gap-3 duration-300 animate-in fade-in-0">
                  <IconButton name="rename" size={16} onClick={toggleIsRenameInputOpen} />
                  <WalletFiatBalance />
                </div>
              </>
            )}
          </Box>

          <RenameWallet wallet={wallet} isOpen={isRenameInputOpen} onClose={toggleIsRenameInputOpen} />

          {multisigAccount && !isRenameInputOpen && (
            <div className="ml-2 shrink-0 duration-300 animate-in fade-in-0">
              <Slot id={overviewSlot} props={{ walletAccounts: [multisigAccount] }} />
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
              <Box padding={[4, 0, 0]} fitContainer>
                {panel}
              </Box>
            </Tabs.Content>
          ))}
        </Tabs>
      </Modal.Content>
    </Modal>
  );
};
