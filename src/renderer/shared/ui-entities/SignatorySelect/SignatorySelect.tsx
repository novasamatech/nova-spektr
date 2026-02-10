import { type BN } from '@polkadot/util';
import { useCallback, useMemo } from 'react';
import { Trans } from 'react-i18next';

import { TEST_IDS } from '@/shared/constants/testIds';
import { type Asset, type Chain, type Wallet } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { nullable, toAddress } from '@/shared/lib/utils';
import { Alert, FootnoteText, InputHint } from '@/shared/ui';
import { Field, Select } from '@/shared/ui-kit';
import { type AnyAccount, accountService, useAccountName } from '@/domains/network';
import { Address } from '../Address/Address';
import { AssetBalance } from '../AssetBalance/AssetBalance';
import { WalletIcon } from '../WalletIcon/WalletIcon';

function getAccount(v: { account: AnyAccount; balance: BN | string } | AnyAccount): AnyAccount {
  return 'balance' in v ? v.account : v;
}

function getBalance(v: { account: AnyAccount; balance: BN | string } | AnyAccount) {
  return 'balance' in v ? v.balance : '';
}

type SignatoryProps = {
  signatory: { account: AnyAccount; balance: BN | string } | AnyAccount;
  network: { chain: Chain; asset: Asset };
};

const SignatoryItem = ({ signatory, network }: SignatoryProps) => {
  const signer = getAccount(signatory);
  const balance = getBalance(signatory);
  const address = toAddress(signer.accountId, { prefix: network.chain.addressPrefix });
  const accountName = useAccountName({
    accountId: signer.accountId,
    chain: network.chain,
  });

  return (
    <Select.Item value={signer.id.toString()}>
      <div className="flex w-full items-center justify-between">
        <Address showIcon variant="truncate" iconSize={20} address={address} title={accountName} canCopy={false} />
        <AssetBalance value={balance.toString()} asset={network.asset} />
      </div>
    </Select.Item>
  );
};

type Props = {
  signatory: AnyAccount | null;
  signatories: { account: AnyAccount; balance: BN | string }[] | AnyAccount[] | undefined;
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
      const selectedSigner = signatories?.find(v => getAccount(v).id === signerId);
      if (!selectedSigner) return;

      onChange(getAccount(selectedSigner));
    },
    [onChange, signatories],
  );

  if (nullable(network) || nullable(initiator) || nullable(signatories)) {
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
        {signatories.map(v => (
          <SignatoryItem key={getAccount(v).id} signatory={v} network={network} />
        ))}
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
          parent="span"
          data-testid={TEST_IDS.VALIDATIONS.MISSING_ACCOUNT}
          values={{ network: chain.name }}
          components={{ wallet: component }}
        />
      </FootnoteText>
    </Alert>
  );
};
