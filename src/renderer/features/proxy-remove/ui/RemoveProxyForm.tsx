import { useUnit } from 'effector-react';
import { type FormEvent } from 'react';

import { useForm } from '@/shared/forms';
import { useI18n } from '@/shared/i18n';
import { getNativeAsset, withdrawableAmount } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { TransactionValidationError } from '@/shared/ui-entities';
import { walletModel } from '@/entities/wallet';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts -> accounts-structure -> wallet-details -> proxy-remove
import { DraftFormBody } from '@/features/drafts/components/DraftFormBody';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts -> accounts-structure -> wallet-details -> proxy-remove
import { DraftModeCard } from '@/features/drafts/components/DraftModeCard';
// eslint-disable-next-line boundaries/entry-point -- direct import to avoid circular: drafts -> accounts-structure -> wallet-details -> proxy-remove
import { DraftSigningPath } from '@/features/drafts/components/DraftSigningPath';
import { SigningPathSection } from '@/features/signing-path';
import { FeeWithLabel, MultisigDepositFee } from '@/widgets/transaction-fee';
import { removeProxyModel } from '../model/remove-proxy-model';

type Props = {
  onGoBack: () => void;
};
export const RemoveProxyForm = ({ onGoBack }: Props) => {
  const { submit } = useForm(removeProxyModel.form);
  const errors = useUnit(removeProxyModel.$errors);
  const wallets = useUnit(walletModel.$wallets);
  const isDraftMode = useUnit(removeProxyModel.$isDraftMode);
  const chain = useUnit(removeProxyModel.$chain);
  const nativeAsset = chain ? getNativeAsset(chain.assets) : null;

  const submitProxy = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <DraftModeCard isOn={isDraftMode} onToggle={removeProxyModel.events.toggleDraftMode} />
      {isDraftMode && chain && (
        <DraftSigningPath
          chainId={chain.chainId}
          asset={nativeAsset}
          pinnedSourceAccountId={null}
          $draftPath={removeProxyModel.$draftSigningPath}
          draftPathCommitted={removeProxyModel.events.draftPathCommitted}
          draftPathEditStarted={removeProxyModel.events.draftPathEditStarted}
          draftPathEditEnded={removeProxyModel.events.draftPathEditEnded}
        />
      )}
      <DraftFormBody
        $isDraftMode={removeProxyModel.$isDraftMode}
        $isDraftPathComplete={removeProxyModel.$isDraftPathComplete}
      >
        <div className="flex flex-col gap-4">
          {!isDraftMode && <TransactionValidationError errors={errors} wallets={wallets} />}
          <form id="add-proxy-form" className="flex flex-col gap-y-4" onSubmit={submitProxy}>
            <Signatories />
          </form>
          {!isDraftMode && (
            <div className="flex flex-col gap-y-6 pt-2 pb-4">
              <FeeSection />
            </div>
          )}
        </div>
      </DraftFormBody>
      <ActionSection onGoBack={onGoBack} />
    </div>
  );
};

const Signatories = () => {
  const { t } = useI18n();

  const {
    fields: { signatory },
  } = useForm(removeProxyModel.form);

  const isDraftMode = useUnit(removeProxyModel.$isDraftMode);
  const signingPath = useUnit(removeProxyModel.$signingPath);
  const chain = useUnit(removeProxyModel.$chain);
  const formErrors = useUnit(removeProxyModel.$errors);

  const nativeAsset = chain ? getNativeAsset(chain.assets) : null;

  if (isDraftMode) return null;

  return (
    <SigningPathSection
      signingPath={signingPath}
      chain={chain}
      asset={nativeAsset}
      txErrors={formErrors}
      errorText={t(signatory.errorMessage)}
      balanceExtractor={(b) => (b ? withdrawableAmount(b) : null)}
      onChange={removeProxyModel.signingPathChanged}
    />
  );
};

const FeeSection = () => {
  const fee = useUnit(removeProxyModel.$fee);
  const multisigDeposit = useUnit(removeProxyModel.$multisigDeposit);
  const chain = useUnit(removeProxyModel.$chain);

  if (!chain) {
    return null;
  }

  return (
    <div className="flex flex-col gap-y-2">
      {!multisigDeposit.isZero() && (
        <MultisigDepositFee asset={getNativeAsset(chain.assets)} multisigDeposit={multisigDeposit} />
      )}

      <FeeWithLabel asset={getNativeAsset(chain.assets)} fee={fee} />
    </div>
  );
};

const ActionSection = ({ onGoBack }: Props) => {
  const { t } = useI18n();

  const canSubmit = useUnit(removeProxyModel.$canSubmit);
  const canSaveAsDraft = useUnit(removeProxyModel.$canSaveAsDraft);
  const isDraftMode = useUnit(removeProxyModel.$isDraftMode);

  return (
    <div className="mt-4 flex items-center justify-between">
      <Button variant="text" onClick={onGoBack}>
        {t('operation.goBackButton')}
      </Button>
      <Button
        form={isDraftMode ? undefined : 'add-proxy-form'}
        type={isDraftMode ? 'button' : 'submit'}
        disabled={isDraftMode ? !canSaveAsDraft : !canSubmit}
        onClick={isDraftMode ? () => removeProxyModel.events.saveAsDraftRequested() : undefined}
      >
        {isDraftMode ? t('operations.drafts.initiateButton') : t('operation.continueButton')}
      </Button>
    </div>
  );
};
