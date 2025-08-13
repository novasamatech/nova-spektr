import { BN_ZERO } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { type FormEvent, type ReactNode, memo, useMemo } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, nonNullable, nullable, toAddress, transferableAmountBN } from '@/shared/lib/utils';
import { Button, FootnoteText, Icon, InputHint, Separator, SmallTitleText } from '@/shared/ui';
import { Address, AssetBalance, ChainSelect } from '@/shared/ui-entities';
import { Box, Field, Input, Modal, ScrollArea, Select } from '@/shared/ui-kit';
import { accountService } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { Fee } from '@/entities/transaction';
import { WalletIcon, walletModel } from '@/entities/wallet';
import { formModel } from '../model/form';

import { JsonArgs } from './JsonArgs';

export const CallDataForm = () => {
  const { t } = useI18n();
  const { submit } = useForm(formModel.form);
  const showSignatories = useUnit(formModel.$showSignatories);

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const args = useUnit(formModel.$args);

  return (
    <>
      <form id="transfer-form" className="flex flex-col gap-y-4 px-5 pb-4" onSubmit={submitForm}>
        <InitiatorSelect />
        {showSignatories && <SignatorySelect />}
        <NetworkSelect />
        <CallDataInput />
      </form>

      <Separator />

      <ScrollArea>
        <Box padding={[4, 5]}>
          {nonNullable(args) && (
            <div className="flex flex-col gap-y-3">
              <SmallTitleText>{t('callData.isCorrect')}</SmallTitleText>
              <JsonArgs value={args} />
            </div>
          )}
          {nullable(args) && (
            <div className="flex flex-col items-center gap-y-2 px-10 py-20">
              <Icon size={64} name="empty" className="mb-4" />
              <SmallTitleText>{t('callData.noDecodedTxTitle')}</SmallTitleText>
              <FootnoteText className="text-text-tertiary">{t('callData.noDecodedTxDescription')}</FootnoteText>
            </div>
          )}
        </Box>
      </ScrollArea>

      <ActionsSection />
    </>
  );
};

const CallDataInput = () => {
  const { t } = useI18n();

  const {
    fields: { callData },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.callData')}>
      <Input height="md" value={callData.value} placeholder={t('callData.placeholder')} onChange={callData.onChange} />
      <InputHint variant="error" active={callData.hasError}>
        {t(callData.errorMessage)}
      </InputHint>
    </Field>
  );
};

const NetworkSelect = memo(() => {
  const { t } = useI18n();

  const availableChains = useUnit(formModel.$availableChains);
  const {
    fields: { chain },
  } = useForm(formModel.form);

  return (
    <Field text={t('callData.fields.network.label')}>
      <ChainSelect
        placeholder={t('callData.fields.network.placeholder')}
        value={chain.value}
        options={availableChains}
        onChange={chain.onChange}
      />
      <InputHint variant="error" active={chain.hasError}>
        {t(chain.errorMessage)}
      </InputHint>
    </Field>
  );
});

const InitiatorSelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const allAccounts = useUnit(formModel.$allAccounts);
  const balances = useUnit(balanceModel.$balances);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { initiator: initiator },
  } = useForm(formModel.form);

  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (id: string) => {
    const v = allAccounts.find((c) => c.id === id);
    if (nonNullable(v)) {
      initiator.onChange(v);
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    // Group accounts by wallet
    const walletGroups = new Map<number, typeof allAccounts>();

    for (const account of allAccounts) {
      const walletId = account.walletId;
      if (!walletGroups.has(walletId)) {
        walletGroups.set(walletId, []);
      }
      walletGroups.get(walletId)!.push(account);
    }

    for (const [walletId, walletAccounts] of walletGroups) {
      const wallet = wallets.find((w) => w.id === walletId);
      if (!wallet) continue;

      const walletTitle = (
        <Box direction="row" gap={2} padding={[1, 0]} verticalAlign="center">
          <WalletIcon type={wallet.type} />
          <FootnoteText className="text-text-secondary">{wallet.name}</FootnoteText>
        </Box>
      );

      options.push(
        <Select.Group key={wallet.id} title={walletTitle}>
          {walletAccounts.map((a) => {
            const balance = balanceUtils.getBalance(balances, a.accountId, chain.chainId, asset.assetId);

            return (
              <Select.Item key={a.id} value={a.id} depth={1}>
                <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
                  <Address
                    showIcon
                    canCopy={false}
                    variant="truncate"
                    title={a.name !== wallet.name ? a.name : void 0}
                    address={toAddress(a.accountId, { prefix: chain?.addressPrefix })}
                  />
                  <AssetBalance
                    className="text-footnote text-text-secondary"
                    value={transferableAmountBN(balance)}
                    asset={asset}
                  />
                </Box>
              </Select.Item>
            );
          })}
        </Select.Group>,
      );
    }

    return options;
  }, [wallets, balances, chain, asset, allAccounts]);

  const wallet = useMemo(() => {
    if (initiator.value) {
      return wallets.find((w) => w.id === initiator.value?.walletId) ?? null;
    }

    return null;
  }, [wallets, initiator.value]);

  const balance = useMemo(() => {
    if (initiator.value && chain && asset) {
      const balance = balanceUtils.getBalance(balances, initiator.value.accountId, chain.chainId, asset.assetId);
      return transferableAmountBN(balance);
    }

    return BN_ZERO;
  }, [wallets, initiator.value, chain, asset]);

  return (
    <Field text={t('callData.fields.initiator.label')}>
      <Select
        placeholder={t('callData.fields.initiator.placeholder')}
        value={initiator.value?.id ?? null}
        valueNode={
          nonNullable(initiator.value) && nonNullable(wallet) ? (
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
              <Address
                showIcon
                canCopy={false}
                variant="truncate"
                title={wallet.name}
                address={toAddress(initiator.value.accountId, { prefix: chain?.addressPrefix })}
              />
              {nonNullable(asset) && (
                <AssetBalance className="text-footnote text-text-secondary" value={balance} asset={asset} />
              )}
            </Box>
          ) : null
        }
        height="md"
        onChange={onChange}
      >
        {options}
      </Select>
      <InputHint variant="error" active={initiator.hasError}>
        {t(initiator.errorMessage)}
      </InputHint>
    </Field>
  );
});

const SignatorySelect = memo(() => {
  const { t } = useI18n();

  const wallets = useUnit(walletModel.$wallets);
  const signatories = useUnit(formModel.$signatories);
  const balances = useUnit(balanceModel.$balances);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const {
    fields: { signatory },
  } = useForm(formModel.form);

  const asset = chain ? getNativeAsset(chain.assets) : null;

  const onChange = (id: string) => {
    const v = signatories.find((c) => c.id === id);
    if (nonNullable(v)) {
      signatory.onChange(v);
    }
  };

  const options = useMemo(() => {
    const options: ReactNode[] = [];
    if (nullable(chain) || nullable(asset)) return options;

    for (const wallet of wallets) {
      const walletAccounts = accountService.filterAccountsByWallet(signatories, wallet.id);
      if (walletAccounts.length === 0) continue;

      const walletTitle = (
        <Box direction="row" gap={2} padding={[1, 0]} verticalAlign="center">
          <WalletIcon type={wallet.type} />
          <FootnoteText className="text-text-secondary">{wallet.name}</FootnoteText>
        </Box>
      );

      options.push(
        <Select.Group key={wallet.id} title={walletTitle}>
          {walletAccounts.map((a) => {
            const balance = balanceUtils.getBalance(balances, a.accountId, chain.chainId, asset.assetId);

            return (
              <Select.Item key={a.id} value={a.id} depth={1}>
                <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
                  <Address
                    showIcon
                    canCopy={false}
                    variant="truncate"
                    title={a.name !== wallet.name ? a.name : void 0}
                    address={toAddress(a.accountId, { prefix: chain?.addressPrefix })}
                  />
                  <AssetBalance
                    className="text-footnote text-text-secondary"
                    value={transferableAmountBN(balance)}
                    asset={asset}
                  />
                </Box>
              </Select.Item>
            );
          })}
        </Select.Group>,
      );
    }

    return options;
  }, [wallets, balances, chain, asset, signatories]);

  const signatoryWallet = useMemo(() => {
    if (signatory.value) {
      return wallets.find((w) => w.id === signatory.value?.walletId) ?? null;
    }

    return null;
  }, [wallets, signatory.value]);

  const signatoryBalance = useMemo(() => {
    if (signatory.value && chain && asset) {
      const balance = balanceUtils.getBalance(balances, signatory.value.accountId, chain.chainId, asset.assetId);
      return transferableAmountBN(balance);
    }

    return BN_ZERO;
  }, [wallets, signatory.value, chain, asset]);

  return (
    <Field text={t('callData.fields.signatory.label')}>
      <Select
        placeholder={t('callData.fields.signatory.placeholder')}
        value={signatory.value?.id ?? null}
        valueNode={
          nonNullable(signatory.value) && nonNullable(signatoryWallet) ? (
            <Box direction="row" verticalAlign="center" horizontalAlign="space-between" gap={2}>
              <Address
                showIcon
                canCopy={false}
                variant="truncate"
                title={signatoryWallet.name}
                address={toAddress(signatory.value.accountId, { prefix: chain?.addressPrefix })}
              />
              {nonNullable(asset) && (
                <AssetBalance className="text-footnote text-text-secondary" value={signatoryBalance} asset={asset} />
              )}
            </Box>
          ) : null
        }
        height="md"
        onChange={onChange}
      >
        {options}
      </Select>
      <InputHint variant="error" active={signatory.hasError}>
        {t(signatory.errorMessage)}
      </InputHint>
    </Field>
  );
});

const ActionsSection = () => {
  const { t } = useI18n();

  const canSubmit = useUnit(formModel.$canSubmit);
  const hasExtrinsic = useUnit(formModel.$hasExtrinsic);
  const fee = useUnit(formModel.$fee);
  const pendingFee = useUnit(formModel.$pendingFee);
  const chain = useUnit(formModel.form.fields.chain.$value);
  const asset = chain ? getNativeAsset(chain.assets) : null;

  return (
    <Modal.Footer>
      {nonNullable(asset) && hasExtrinsic && (
        <Box direction="row" gap={2} verticalAlign="center">
          <FootnoteText className="text-text-tertiary">{t('operation.networkFee')}</FootnoteText>
          <Fee className="text-footnote" fee={fee} isLoading={pendingFee} asset={asset} hideFiat />
        </Box>
      )}

      <Button form="transfer-form" type="submit" disabled={!canSubmit}>
        {t('transfer.continueButton')}
      </Button>
    </Modal.Footer>
  );
};
