import { useStoreMap, useUnit } from 'effector-react';
import { keyBy, uniqBy } from 'lodash';
import { type PropsWithChildren, type ReactNode, useMemo, useState } from 'react';

import { type Address as AccountAddress, type ID } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { entries, includesMultiple, toAccountId, toAddress } from '@/shared/lib/utils';
import { RelayChains } from '@/shared/lib/utils/constants';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { Button, CaptionText } from '@/shared/ui';
import { Address, Identicon, WalletIcon } from '@/shared/ui-entities';
import { Box, Combobox, Field, Modal } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { networkModel } from '@/entities/network';
import { accountUtils, walletModel } from '@/entities/wallet';
import { walletSelectFeature } from '@/features/wallet-select';
import { beneficiary } from '../model/beneficiary';
import { fellowshipSalaryFeature } from '../model/feature';

const { services, constants } = walletSelectFeature;

type Props = PropsWithChildren<{
  disabled?: boolean;
}>;

type ComboboxItem = {
  id: string;
  label: ReactNode;
  value: { address: AccountAddress; walletId?: ID };
};

type ComboboxGroup = {
  id: string;
  label: ReactNode;
  items: ComboboxItem[];
};

export const SalaryEditBeneficiaryModal = ({ disabled, children }: Props) => {
  const { t } = useI18n();
  const chain = useStoreMap(fellowshipSalaryFeature.input, input => input?.chain ?? null);
  const currentBeneficiary = useUnit(beneficiary.$beneficiary);
  const accountsList = useUnit(walletModel.$availableAccounts);
  const wallets = useUnit(walletModel.$wallets);
  const chains = useUnit(networkModel.$chains);
  const polkadotChain = chains[RelayChains.POLKADOT];

  const [open, setOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<AccountId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');

  const handleToggle = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) return;

    setSelectedBeneficiary(currentBeneficiary);
    const addr = currentBeneficiary && chain ? toAddress(currentBeneficiary, { prefix: chain.addressPrefix }) : '';
    setInputValue(addr);
    setSearchQuery('');
  };

  const handleSave = () => {
    beneficiary.change(selectedBeneficiary);
    setOpen(false);
  };

  const handleAddressChange = (value: string) => {
    setSelectedBeneficiary(toAccountId(value));
    setInputValue(value);
  };

  const walletsMap = useMemo(() => keyBy(wallets, 'id'), [wallets]);

  const walletsOptions = useMemo<ComboboxGroup[]>(() => {
    if (!chain || accountsList.length === 0) return [];

    const filteredAccounts = accountsList.filter(account => {
      const isNotWatchOnly = !accountUtils.isWatchOnlyAccount(account);
      const isPolkadotChain = accountService.isAccountAvailableOnChain(account, polkadotChain);
      const address = toAddress(account.accountId, { prefix: chain.addressPrefix });
      const queryPass = includesMultiple([account.name, address], searchQuery);

      return isPolkadotChain && isNotWatchOnly && queryPass;
    });

    const uniqueAccounts = uniqBy(filteredAccounts, 'accountId');

    if (uniqueAccounts.length === 0) return [];

    const accountByGroup = services.walletSelect.getWalletFamilyByAccounts(wallets, uniqueAccounts);
    const ownAccountOptions: ComboboxGroup[] = [];

    for (const [walletFamily, accountsGroup] of entries(accountByGroup)) {
      if (accountsGroup.length === 0) continue;

      const accountOptions: ComboboxItem[] = [];

      for (const account of accountsGroup) {
        const wallet = walletsMap[account.walletId];
        const address = toAddress(account.accountId, { prefix: chain.addressPrefix });

        const title = wallet
          ? account.name === wallet.name
            ? account.name
            : `${account.name} (${wallet.name})`
          : account.name;

        accountOptions.push({
          id: address,
          value: { address, walletId: account.walletId },
          label: <Address showIcon title={title} address={address} />,
        });
      }

      if (accountOptions.length > 0) {
        ownAccountOptions.push({
          id: walletFamily,
          label: (
            <div className="flex items-center gap-x-2" key={walletFamily}>
              <WalletIcon type={walletFamily} />
              <CaptionText className="font-semibold text-text-secondary uppercase">
                {t(constants.GROUP_LABELS[walletFamily])}
              </CaptionText>
            </div>
          ),
          items: accountOptions,
        });
      }
    }

    return ownAccountOptions;
  }, [chain?.chainId, accountsList, wallets, walletsMap, searchQuery]);

  return (
    <Modal size="md" isOpen={open} onToggle={handleToggle}>
      <Modal.Trigger disabled={disabled}>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.salary.editBeneficiary')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]}>
          <Field text={t('fellowship.salary.beneficiary')}>
            <Box direction="row" gap={2} horizontalAlign="center" verticalAlign="center">
              <Combobox
                placeholder={t('fellowship.salary.salaryInfo.selectBeneficiary')}
                value={inputValue}
                prefixElement={
                  <div className="flex h-auto items-center">
                    <Identicon
                      size={20}
                      address={toAddress(inputValue, { prefix: chain?.addressPrefix })}
                      background={false}
                    />
                  </div>
                }
                height="md"
                onChange={handleAddressChange}
                onInput={setSearchQuery}
              >
                {walletsOptions.map(group => (
                  <Combobox.Group key={group.id} title={group.label}>
                    {group.items.map(option => (
                      <Combobox.Item
                        key={`${option.id}-${option.value.walletId ?? 'unknown'}`}
                        value={option.value.address}
                      >
                        {option.label}
                      </Combobox.Item>
                    ))}
                  </Combobox.Group>
                ))}
              </Combobox>
            </Box>
          </Field>
        </Box>

        <Modal.Footer>
          <Button onClick={handleSave}>{t('general.button.continueButton')}</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};
