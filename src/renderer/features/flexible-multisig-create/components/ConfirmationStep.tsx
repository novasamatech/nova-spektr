import { useForm } from 'effector-forms';
import { useUnit } from 'effector-react';

import { WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { Step } from '@/shared/lib/utils';
import { Alert, BodyText, Button, Counter, DetailRow, Icon, IconButton, Separator } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { AssetBalance } from '@/entities/asset';
import { SignButton } from '@/entities/operations';
import { AssetFiatBalance } from '@/entities/price';
import { FeeWithLabel, MultisigDepositWithLabel, ProxyDepositLabel } from '@/entities/transaction';
import { WalletIcon } from '@/entities/wallet';
import { confirmModel } from '../model/confirm-model';
import { flexibleMultisigModel } from '../model/flexible-multisig-create';
import { formModel } from '../model/form-model';
import { signatoryModel } from '../model/signatory-model';

import { SelectedSignatoriesModal } from './SelectedSignatoriesModal';

export const ConfirmationStep = () => {
  const { t } = useI18n();

  const signerWallet = useUnit(flexibleMultisigModel.$signerWallet);
  const signer = useUnit(flexibleMultisigModel.$signer);
  const api = useUnit(flexibleMultisigModel.$api);
  const transaction = useUnit(flexibleMultisigModel.$transaction);
  const isEnoughBalance = useUnit(flexibleMultisigModel.$isEnoughBalance);
  const proxyDeposit = useUnit(flexibleMultisigModel.$proxyDeposit);
  const chain = useUnit(formModel.$chain);
  const signatories = useUnit(signatoryModel.$signatories);
  const ownedSignatories = useUnit(signatoryModel.$ownedSignatoriesWallets);

  const {
    fields: { name, threshold },
  } = useForm(formModel.$createMultisigForm);

  const asset = chain?.assets?.[0];
  const walletName = signer?.name || (signerWallet?.type === WalletType.POLKADOT_VAULT && signerWallet?.name) || '';

  return (
    <>
      <Modal.Content>
        <section className="relative flex h-full w-modal flex-1 flex-col px-5">
          <div className="flex max-h-full flex-1 flex-col">
            <div className="mb-6 flex flex-col items-center">
              <Icon className="text-icon-default" name="multisigCreationConfirm" size={60} />
            </div>
            <DetailRow label={t('createMultisigAccount.walletName')}>{name.value}</DetailRow>
            <DetailRow wrapperClassName="my-4" label={t('createMultisigAccount.signatoriesLabel')}>
              {chain && (
                <SelectedSignatoriesModal signatories={signatories} chain={chain}>
                  <div className="flex items-center">
                    <Counter className="mr-2" variant="neutral">
                      {signatories.length}
                    </Counter>
                    <IconButton name="info" className="cursor-pointer hover:text-icon-hover" size={16} />
                  </div>
                </SelectedSignatoriesModal>
              )}
            </DetailRow>
            <DetailRow label={t('createMultisigAccount.thresholdName')}>
              {t('createMultisigAccount.thresholdOutOf', {
                threshold: threshold.value,
                signatoriesLength: signatories.length,
              })}
            </DetailRow>

            <Separator className="my-4 border-filter-border" />
            <DetailRow label={t('createMultisigAccount.signingWallet')}>
              <div className="flex w-full items-center justify-end gap-x-2">
                <WalletIcon type={signerWallet?.type || WalletType.POLKADOT_VAULT} />

                <div className="flex max-w-[348px] flex-col">
                  <BodyText as="span" className="truncate tracking-tight text-text-secondary">
                    {walletName}
                  </BodyText>
                </div>
              </div>
            </DetailRow>

            <Separator className="my-4 border-filter-border" />
            {chain && asset ? (
              <div className="mb-4 flex flex-1 flex-col gap-y-4">
                <ProxyDepositLabel>
                  <div className="flex flex-col items-end gap-y-0.5">
                    <AssetBalance value={proxyDeposit} asset={asset} className="text-footnote" />
                    <AssetFiatBalance asset={asset} amount={proxyDeposit.toString()} />
                  </div>
                </ProxyDepositLabel>
                <MultisigDepositWithLabel
                  className="text-footnote"
                  asset={asset}
                  threshold={threshold.value}
                  api={api}
                />
                <FeeWithLabel api={api} asset={asset} transaction={transaction} />
                <Alert
                  variant="error"
                  title={t('createMultisigAccount.notEnoughTokensTitle')}
                  active={!isEnoughBalance}
                >
                  <Alert.Item withDot={false}>
                    {t('createMultisigAccount.flexibleMultisig.notEnoughMultisigTokens')}
                  </Alert.Item>
                </Alert>
              </div>
            ) : null}
          </div>
        </section>
      </Modal.Content>

      <Modal.Footer>
        <Box fitContainer direction="row" horizontalAlign="space-between" verticalAlign="center">
          <Button
            variant="text"
            onClick={() => {
              return (ownedSignatories || []).length > 1
                ? flexibleMultisigModel.events.stepChanged(Step.SIGNER_SELECTION)
                : flexibleMultisigModel.events.stepChanged(Step.SIGNATORIES_THRESHOLD);
            }}
          >
            {t('createMultisigAccount.backButton')}
          </Button>
          <SignButton
            disabled={!isEnoughBalance}
            type={signerWallet?.type || WalletType.POLKADOT_VAULT}
            onClick={confirmModel.output.formSubmitted}
          />
        </Box>
      </Modal.Footer>
    </>
  );
};
