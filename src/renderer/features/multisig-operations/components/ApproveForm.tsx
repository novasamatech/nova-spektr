import { useUnit } from 'effector-react';
import { useMemo } from 'react';

import { type Asset, type Chain } from '@/shared/core';
import { Slot } from '@/shared/di';
import { useI18n } from '@/shared/i18n';
import { transferableAmount } from '@/shared/lib/utils';
import { Button, Icon, Separator } from '@/shared/ui';
import { AccountSelect, SignatorySelect, TransactionValidationError } from '@/shared/ui-entities';
import { Field } from '@/shared/ui-kit';
import { type AnyAccount, type MultisigOperation, accounts } from '@/domains/network';
import { balanceModel, balanceUtils } from '@/entities/balance';
import { walletModel } from '@/entities/wallet';
import { SigningPathControl } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { approveModel } from '../model/approve-model';

import { confirmTransactionInfoSlot } from './ActionSteps/Confirmation';
import { getIconName } from './ActionSteps/transactionConfirmIcon';

type Props = {
  unsignedAccounts: AnyAccount[];
  chain: Chain;
  nativeAsset: Asset;
  onSubmit: () => void;
  operation: MultisigOperation;
};

export const ApproveForm = ({ unsignedAccounts, chain, nativeAsset, onSubmit, operation }: Props) => {
  const { t } = useI18n();

  const balances = useUnit(balanceModel.$balanceMap);
  const allAccounts = useUnit(accounts.$list);
  const allWallets = useUnit(walletModel.$wallets);
  const fee = useUnit(approveModel.$fee);
  const isFeeLoading = useUnit(approveModel.$isFeeLoading);
  const isDepositRequired = useUnit(approveModel.$isDepositRequired);
  const multisigDeposit = useUnit(approveModel.$multisigDeposit);
  const wallets = useUnit(walletModel.$wallets);
  const errors = useUnit(approveModel.$errors);
  const canSubmit = useUnit(approveModel.$canSubmit);

  const initiator = useUnit(approveModel.$initiator);
  const signatory = useUnit(approveModel.$signatory);

  const signatories = useUnit(approveModel.$signatories);
  const signingPath = useUnit(approveModel.$signingPath);

  const signatoriesWithBalance = useMemo(() => {
    return signatories.map(s => {
      const balance = balanceUtils.getBalance(balances, s.accountId, chain.chainId, nativeAsset.assetId);
      return { account: s, balance: transferableAmount(balance) };
    });
  }, [signatories, balances, chain, nativeAsset]);

  const network = useMemo(() => ({ chain, asset: nativeAsset }), [chain, nativeAsset]);

  const pathChip = (
    <SigningPathControl chainId={chain.chainId} path={signingPath} onChange={approveModel.signingPathChanged} />
  );

  return (
    <div className="flex flex-col items-center gap-y-3 px-5 pb-4">
      <TransactionValidationError errors={errors} wallets={wallets} />

      <div className="mb-6 flex flex-col items-center gap-y-3">
        <Icon className="text-icon-default" name={getIconName(operation.transaction)} size={60} />

        <Slot id={confirmTransactionInfoSlot} props={{ operation }} />
      </div>

      <Field text={t('operation.selectAccountLabel')}>
        <AccountSelect
          value={initiator}
          placeholder={t('operation.selectAccount')}
          options={unsignedAccounts}
          chain={chain}
          asset={nativeAsset}
          balances={balances}
          balanceType="transferable"
          onChange={approveModel.selectInitiator}
        />
      </Field>

      <SignatorySelect
        signatory={signatory}
        signatories={signatoriesWithBalance}
        allAccounts={allAccounts}
        allWallets={allWallets}
        initiator={initiator}
        hasError={false}
        errorText=""
        network={network}
        action={pathChip}
        onChange={approveModel.selectSignatory}
      />

      <Separator className="my-1 w-full" />

      {nativeAsset && (
        <>
          {isDepositRequired && <MultisigDepositFee asset={nativeAsset} multisigDeposit={multisigDeposit} />}
          {signatory && <FeeWithLabel fee={fee} asset={nativeAsset} isLoading={isFeeLoading} />}
        </>
      )}

      <Button disabled={!canSubmit} className="ml-auto" onClick={onSubmit}>
        {t('operation.continueButton')}
      </Button>
    </div>
  );
};
