import { useGate, useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type FlexibleMultisigWallet, type MultisigWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { assert, toAddress } from '@/shared/lib/utils';
import { FootnoteText, Icon, IconButton } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';
import { Address, ChainAccountsList, RootExplorers } from '@/shared/ui-entities';
import { Box, Dropdown, Modal, Tabs } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { networkModel, networkUtils } from '@/entities/network';
import { ContactItem, WalletCardLg, WalletCardMd, accountUtils, permissionUtils } from '@/entities/wallet';
import { flexibleMultisigFeature } from '@/features/flexible-multisig-create';
import { convertToFlexibleFeature } from '@/features/multisig-convert-to-flexible';
import { proxyAddFeature } from '@/features/proxy-add';
import { proxyAddPureFeature } from '@/features/proxy-add-pure';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { multisigWalletDetailsModel } from '../../model/multisig-wallet-details';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

const {
  models: { addPureProxied },
  views: { AddPureProxied },
} = proxyAddPureFeature;

const {
  models: { convertToFlexibleModel },
  views: { ConvertRegularToFlexible },
} = convertToFlexibleFeature;

type Props = {
  wallet: MultisigWallet | FlexibleMultisigWallet;
  onClose: () => void;
};
export const MultisigWalletDetails = ({ wallet, onClose }: Props) => {
  useGate(multisigWalletDetailsModel.flow, { wallet });

  const { t } = useI18n();

  const chains = useUnit(networkModel.$chains);
  const hasProxies = useUnit(multisigWalletDetailsModel.$hasProxies);
  const signatories = useUnit(multisigWalletDetailsModel.$signatories);
  const accountList = useUnit(accounts.$list);

  const [isRenameModalOpen, toggleIsRenameModalOpen] = useToggle();
  const [isConfirmForgetOpen, toggleConfirmForget] = useToggle();
  const [tab, setTab] = useState('1');

  const walletAccounts = accountService.filterAccountsByWallet(accountList, wallet.id);
  const multisigAccount = walletAccounts.find(accountUtils.isMultisigAccount);
  assert(multisigAccount, 'Multisig account not found.');

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

  const options = [
    {
      icon: 'rename' as IconNames,
      title: t('walletDetails.common.renameButton'),
      onClick: toggleIsRenameModalOpen,
    },
    {
      icon: 'forget' as IconNames,
      title: t('walletDetails.common.forgetButton'),
      onClick: toggleConfirmForget,
    },
  ];

  if (canCreateProxy) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
    });
  }

  // TODO: remove it when flexible multisig is supported
  if (canCreatePureProxy) {
    flexibleMultisigFeature.isRunning
      ? options.push({
          icon: 'addCircle' as IconNames,
          title: t('walletDetails.common.convertToFlexibleAction'),
          onClick: () => convertToFlexibleModel.flow.open({ wallet }),
        })
      : options.push({
          icon: 'addCircle' as IconNames,
          title: t('walletDetails.common.addPureProxiedAction'),
          onClick: addPureProxied.events.flowStarted,
        });
  }

  const ActionButton = (
    <Dropdown align="end">
      <Dropdown.Trigger>
        <IconButton name="more" />
      </Dropdown.Trigger>
      <Dropdown.Content>
        {options.map(option => (
          <Dropdown.Item key={option.title} onSelect={option.onClick}>
            <Icon name={option.icon} size={20} className="text-icon-accent" />
            <span className="text-text-secondary">{option.title}</span>
          </Dropdown.Item>
        ))}
      </Dropdown.Content>
    </Dropdown>
  );

  const TabItems: { id: string; title: string; panel: ReactNode }[] = [];

  const multisigAccounts = multisigChains.map(chain => [chain, multisigAccount.accountId] as const);

  const TabAccountList = {
    id: '1',
    title: t('walletDetails.multisig.networksTab'),
    panel: <ChainAccountsList accounts={multisigAccounts} />,
  };

  const TabSignatories = {
    id: '2',
    title: t('walletDetails.multisig.signatoriesTab'),
    panel: (
      <div className="flex flex-col">
        <FootnoteText className="px-5 text-text-tertiary">
          {t('walletDetails.multisig.thresholdLabel', {
            min: multisigAccount.threshold,
            max: multisigAccount.signatories.length,
          })}
        </FootnoteText>

        <div>
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
            <div>
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
        </div>
      </div>
    ),
  };

  TabItems.push(TabAccountList);
  TabItems.push(TabSignatories);

  if (canCreateProxy) {
    const TabProxy = {
      id: '3',
      title: t('walletDetails.common.proxiesTabTitleShort'),
      panel: hasProxies ? (
        <ProxiesList wallet={wallet} canCreateProxy={canCreateProxy} />
      ) : (
        <NoProxiesAction canCreateProxy={canCreateProxy} onAddProxy={addProxy.events.flowStarted} />
      ),
    };

    TabItems.push(TabProxy);
  }

  return (
    <>
      <Modal size="md" height="lg" isOpen onToggle={open => !open && onClose()}>
        <Modal.Title close action={ActionButton}>
          {t('walletDetails.common.title')}
        </Modal.Title>
        <Modal.HeaderContent>
          <div className="mb-4 flex flex-col gap-y-2.5 border-b border-divider px-5 pb-6 pt-4">
            <WalletCardLg wallet={wallet} />
            <div className="flex items-center">
              <Icon name="arrowCurveLeftRight" size={16} className="mr-1" />
              <div className="flex items-center text-footnote">
                <Trans
                  t={t}
                  i18nKey="walletDetails.multisig.chainTitle"
                  values={{
                    threshold: multisigAccount.threshold,
                    signatories: multisigAccount.signatories.length,
                  }}
                />
              </div>
            </div>
          </div>
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

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy wallet={wallet} />
      <AddPureProxied wallet={wallet} />
      <ConvertRegularToFlexible />
    </>
  );
};
