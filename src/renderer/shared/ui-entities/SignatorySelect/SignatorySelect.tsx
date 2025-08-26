import { useCallback, useMemo } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable, toAddress, toShortAddress } from '@/shared/lib/utils';
import { Alert, FootnoteText, InputHint } from '@/shared/ui';
import { Field, Select } from '@/shared/ui-kit';
import { type AnyAccount, accountService } from '@/domains/network';
import { accountUtils } from '@/entities/wallet';
import { Address } from '../Address/Address';
import { AssetBalance } from '../AssetBalance/AssetBalance';
import { WalletIcon } from '../WalletIcon/WalletIcon';

type Props = {
  signatory: AnyAccount | null;
  signatories: { account: AnyAccount; balance: string }[];
  hasError: boolean;
  errorText: string;
  onChange: (signatory: AnyAccount) => void;
  network: { chain: Chain; asset: Asset } | null;
  allAccounts: AnyAccount[];
  initiator: AnyAccount | null;
  allWallets: Wallet[];
};

export const SignatorySelect = ({
  signatory,
  signatories,
  hasError,
  errorText,
  onChange,
  network,
  allAccounts,
  initiator,
  allWallets,
}: Props) => {
  const { t } = useI18n();

  const selectSigner = useCallback(
    (signerId: string) => {
      const selectedSigner = signatories.find(({ account: signer }) => signer.id === signerId);
      if (!selectedSigner) return;

      onChange(selectedSigner.account);
    },
    [onChange, signatories],
  );

  if (nullable(network) || nullable(initiator)) {
    return null;
  }

  if (signatories.length === 0) {
    return (
      <NoSignatoryAlert allWallets={allWallets} initiator={initiator} allAccounts={allAccounts} chain={network.chain} />
    );
  }

  // Hide selector if less than two signatories are available
  if (signatories.length <= 1) {
    return null;
  }

  return (
    <Field text={t('proxy.addProxy.signatoryLabel')}>
      <Select
        placeholder={t('proxy.addProxy.signatoryPlaceholder')}
        value={signatory?.id.toString() ?? null}
        testId={TEST_IDS.OPERATIONS.SIGNATORY_SELECTOR}
        invalid={hasError}
        height="md"
        onChange={value => selectSigner(value)}
      >
        {signatories.map(({ account: signer, balance }) => {
          const isShard = accountUtils.isVaultShardAccount(signer);
          const address = toAddress(signer.accountId, { prefix: network.chain.addressPrefix });

          return (
            <Select.Item key={signer.id} value={signer.id.toString()}>
              <div className="flex w-full items-center justify-between">
                <Address
                  showIcon
                  variant="truncate"
                  iconSize={20}
                  address={address}
                  title={isShard ? toShortAddress(address, 16) : signer.name}
                  canCopy={false}
                />
                <AssetBalance value={balance.toString()} asset={network.asset} />
              </div>
            </Select.Item>
          );
        })}
      </Select>

      <InputHint variant="error" active={hasError}>
        {errorText}
      </InputHint>
    </Field>
  );
};

type NoSignatoryAlertProps = {
  initiator: AnyAccount;
  allAccounts: AnyAccount[];
  chain: Chain;
  allWallets: Wallet[];
};

const NoSignatoryAlert = ({ initiator, allAccounts, chain, allWallets }: NoSignatoryAlertProps) => {
  const { t } = useI18n();

  const found = useMemo(() => {
    const leafs = accountService.findLeafs(initiator, allAccounts, chain);
    const leafsAccountIds = leafs.map(leaf => leaf.accountId);

    const account = allAccounts.find(account => leafsAccountIds.includes(account.accountId));

    if (!account) {
      return null;
    }

    return allWallets.find(wallet => wallet.id === account.walletId);
  }, [initiator, allAccounts, chain]);

  const component = (
    <span className="mx-1 inline-flex max-w-[200px] items-center gap-x-1 align-bottom">
      {found && <WalletIcon type={found.type} size={16} />}
      <FootnoteText as="span" className="truncate text-text-secondary transition-colors">
        {found?.name}
      </FootnoteText>
    </span>
  );

  return (
    <Alert active title={t('operation.noSignatoryErrorTitle', { network: chain.name })} variant="error">
      <FootnoteText className="max-w-full tracking-tight text-text-secondary">
        <Trans
          t={t}
          i18nKey="operation.noSignatoryErrorDescription"
          values={{ network: chain.name }}
          components={{ wallet: component }}
        />
      </FootnoteText>
    </Alert>
  );
};
