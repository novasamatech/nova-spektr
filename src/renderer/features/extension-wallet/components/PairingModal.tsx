import { useUnit } from 'effector-react';
import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, IconButton, Loader, SmallTitleText } from '@/shared/ui';
import { ChainAccountsList, Identicon } from '@/shared/ui-entities';
import { Box, Carousel, Field, Input, Modal, Select } from '@/shared/ui-kit';
import { type AnyAccount, accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { pairingForm } from '../model/pairingForm';
import { type ExtensionType } from '../types';

import { EmptyState } from './EmptyState';

type Props = PropsWithChildren<{
  title?: string;
  extension: ExtensionType;
}>;

export const PairingModal = ({ title, extension, children }: Props) => {
  const { t } = useI18n();

  const { extension: flowExtension } = useUnit(pairingForm.flow.state);
  const step = useUnit(pairingForm.$step);
  const accounts = useUnit(pairingForm.$accounts);
  const chains = useUnit(networkModel.$chains);

  const open = extension === flowExtension;

  const [name, setName] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<AccountId | null>(null);

  const account = useMemo(() => {
    return accounts.find((a) => a.accountId === selectedAccount) ?? null;
  }, [accounts, selectedAccount]);

  const list = useMemo(() => {
    if (!account || step === 'idle') return [];

    const filteredChains = Object.values(chains).filter((c) => {
      // TODO fix it somehow
      return accountService.isAccountAvailableOnChain(account as unknown as AnyAccount, c);
    });

    return filteredChains.map((chain) => [chain, account.accountId] as const);
  }, [chains, account, step]);

  useEffect(() => {
    if (account) {
      setName(account.name);
    }
  }, [account]);

  const toggleModal = (open: boolean) => {
    if (open) {
      pairingForm.flow.open({ extension });
    } else {
      setName('');
      setSelectedAccount(null);
      pairingForm.flow.close({ extension: null });
    }
  };

  return (
    <Modal size="xl" isOpen={open} onToggle={toggleModal}>
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Content disableScroll>
        <Box direction="row" height="576px">
          <div className="flex w-[50%] flex-col">
            <Modal.Title>{title}</Modal.Title>
            <Box grow={1} padding={5}>
              <Carousel item={step}>
                <Carousel.Item id="idle" index={0}>
                  <Box gap={4}>
                    <SmallTitleText>{t('onboarding.extension.permissionStep')}</SmallTitleText>
                    <Button onClick={() => pairingForm.reconnect()}>{t('onboarding.extension.requestPairing')}</Button>
                  </Box>
                </Carousel.Item>
                <Carousel.Item id="pairing" index={1}>
                  <Box direction="row" verticalAlign="center" gap={4}>
                    <SmallTitleText>{t('onboarding.extension.pairingStep')}</SmallTitleText>
                    <Loader color="primary" />
                  </Box>
                </Carousel.Item>
                <Carousel.Item id="select" index={2}>
                  <Box gap={4}>
                    <SmallTitleText>{t('onboarding.extension.manageTitle')}</SmallTitleText>
                    <Field text={t('onboarding.extension.selectAccountLabel')}>
                      <Select<AccountId>
                        value={selectedAccount}
                        placeholder={t('onboarding.extension.selectAccountPlaceholder')}
                        onChange={setSelectedAccount}
                      >
                        {accounts.map((account) => (
                          <Select.Item key={account.accountId} value={account.accountId}>
                            <Box direction="row" gap={2} verticalAlign="center">
                              <Identicon address={toAddress(account.accountId)} />
                              <span>{account.name}</span>
                            </Box>
                          </Select.Item>
                        ))}
                      </Select>
                    </Field>
                    <Field text={t('onboarding.walletNameLabel')}>
                      <Input value={name} placeholder={t('onboarding.walletNamePlaceholder')} onChange={setName} />
                    </Field>
                  </Box>
                </Carousel.Item>
                <Carousel.Item id="rejected" index={3}>
                  <Box gap={4}>
                    <SmallTitleText>{t('onboarding.extension.requestRejected')}</SmallTitleText>
                    <Button onClick={() => pairingForm.reconnect()}>
                      {t('onboarding.extension.askPermissionAgain')}
                    </Button>
                  </Box>
                </Carousel.Item>
              </Carousel>
            </Box>
            <Modal.Footer align="start">
              <Button variant="text" onClick={() => toggleModal(false)}>
                {t('general.button.backButton')}
              </Button>
              {step === 'select' ? (
                <div className="flex grow justify-end">
                  <Button
                    disabled={!account || !name.trim()}
                    onClick={() => pairingForm.create({ name, account: account! })}
                  >
                    {t('onboarding.extension.create')}
                  </Button>
                </div>
              ) : null}
            </Modal.Footer>
          </div>

          <div className="relative flex min-h-0 w-[50%] flex-col gap-4 rounded-r-lg bg-input-background-disabled pt-4">
            <div className="absolute top-3 right-3 m-1">
              <IconButton name="close" size={20} onClick={() => toggleModal(false)} />
            </div>

            {list.length > 0 ? (
              <>
                <SmallTitleText className="mt-[52px] px-5">{t('onboarding.extension.accountsTitle')}</SmallTitleText>
                <ChainAccountsList accounts={list} />
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        </Box>
      </Modal.Content>
    </Modal>
  );
};
