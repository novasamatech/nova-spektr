import { useGate, useUnit } from 'effector-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { type FlexibleMultisigWallet, type MultisigWallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { useToggle } from '@/shared/lib/hooks';
import { assert, nonNullable, toAddress } from '@/shared/lib/utils';
import { BodyText, FootnoteText, Icon, IconButton } from '@/shared/ui';
import { type IconNames } from '@/shared/ui/types';
import { AccountExplorers, Address } from '@/shared/ui-entities';
import { Box, Dropdown, Modal, ScrollArea, Tabs } from '@/shared/ui-kit';
import { accountService, accounts } from '@/domains/network';
import { ChainTitle } from '@/entities/chain';
import { networkModel, networkUtils } from '@/entities/network';
import { ContactItem, WalletCardLg, WalletCardMd, accountUtils, permissionUtils } from '@/entities/wallet';
import { proxyAddFeature } from '@/features/proxy-add';
import { ForgetWalletModal } from '@/features/wallets/ForgetWallet';
import { RenameWalletModal } from '@/features/wallets/RenameWallet';
import { multisigWalletDetailsModel } from '../../model/multisig-wallet-details';
import { NoProxiesAction } from '../components/NoProxiesAction';
import { ProxiesList } from '../components/ProxiesList';

const {
  models: { addProxy },
  views: { AddProxy },
} = proxyAddFeature;

type Props = {
  wallet: MultisigWallet | FlexibleMultisigWallet;
  onClose: () => void;
};

export const FlexibleWalletDetails = ({ wallet, onClose }: Props) => {
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
  const proxiedAccount = walletAccounts.find(accountUtils.isProxiedAccount);

  assert(multisigAccount, 'Multisig account not found.');

  const chain = chains[multisigAccount.chainId];

  const canCreateProxy = useMemo(() => {
    const anyProxy = permissionUtils.canCreateAnyProxy(wallet);
    const nonAnyProxy = permissionUtils.canCreateNonAnyProxy(wallet);

    return (anyProxy || nonAnyProxy) && networkUtils.isProxySupported(chain?.options);
  }, [chain]);

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
    {
      icon: 'changeValidators' as IconNames,
      title: t('walletDetails.multisig.changeSignatories'),
      onClick: () => {},
    },
  ];

  if (canCreateProxy) {
    options.push({
      icon: 'addCircle' as IconNames,
      title: t('walletDetails.common.addProxyAction'),
      onClick: addProxy.events.flowStarted,
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
            {nonNullable(chain) && (
              <div className="flex items-center">
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

      <RenameWalletModal wallet={wallet} isOpen={isRenameModalOpen} onClose={toggleIsRenameModalOpen} />

      <ForgetWalletModal
        wallet={wallet}
        isOpen={isConfirmForgetOpen}
        onClose={toggleConfirmForget}
        onForget={onClose}
      />

      <AddProxy wallet={wallet} />
    </>
  );
};
