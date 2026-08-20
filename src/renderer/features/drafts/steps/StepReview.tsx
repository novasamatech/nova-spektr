import { type Chain, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type RecipientWarning } from '@/shared/lib/recipient-verification';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import {
  type IconNames,
  CaptionText,
  FootnoteText,
  HelpText,
  Icon,
  InputHint,
  Separator,
  SmallTitleText,
} from '@/shared/ui';
import { UnknownRecipientAckBox } from '@/shared/ui-entities';
import { Field, TextArea } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { type OperationTitle } from '@/features/multisig-operations';
import { PathBreadcrumb, PathReviewPopover } from '@/features/signing-path';
import { DraftSummary } from '../components/DraftSummary';
import { DESCRIPTION_MAX_LENGTH } from '../model/create-draft-model';

type Props = {
  path: PathNode[];
  chain: Chain | null;
  callData: string;
  decodedCallData: object | null;
  titleData: OperationTitle | null;
  operationIcon: IconNames | null;
  destinationAccountId: AccountId | null;
  recipientWarning: RecipientWarning;
  riskAcknowledged: boolean;
  onRiskAcknowledgedChange: (checked: boolean) => void;
  description: string;
  onDescriptionChanged: (v: string) => void;
  // Legacy-shape props for DraftSummary — required while DraftSummary hasn't been updated yet:
  multisigName?: string;
  multisigAccountId?: AccountId;
  walletType?: WalletType | null;
  threshold?: string;
};

export const StepReview = ({
  path,
  chain,
  callData,
  decodedCallData,
  titleData,
  operationIcon,
  destinationAccountId,
  recipientWarning,
  riskAcknowledged,
  onRiskAcknowledgedChange,
  description,
  onDescriptionChanged,
  multisigName,
  multisigAccountId,
  walletType,
  threshold,
}: Props) => {
  const { t } = useI18n();

  // Render the operation title as a pill in the card header — strip it from the body rows.
  const summaryTitleData = titleData ? { ...titleData, title: undefined } : null;

  return (
    <div className="flex flex-col gap-5">
      {path.length > 0 && (
        <section className="flex flex-col gap-y-2">
          {chain && (
            <div className="flex">
              <PathReviewPopover path={path} chainId={chain.chainId} />
            </div>
          )}
          {chain && <PathBreadcrumb path={path} chainId={chain.chainId} size="sm" orientation="auto" />}
        </section>
      )}

      <Field
        text={
          <>
            {t('operations.drafts.descriptionLabel')} <span className="text-text-negative">*</span>
          </>
        }
      >
        <TextArea
          placeholder={t('operations.drafts.descriptionPlaceholder')}
          value={description}
          rows={3}
          invalid={description.length > DESCRIPTION_MAX_LENGTH}
          onChange={onDescriptionChanged}
        />
        <InputHint variant="error" active={description.length > DESCRIPTION_MAX_LENGTH}>
          {t('operations.drafts.descriptionMaxLengthError', { max: DESCRIPTION_MAX_LENGTH })}
        </InputHint>
      </Field>

      <div className="flex flex-col rounded-lg border border-container-border bg-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <SmallTitleText className="text-text-primary">{t('operations.drafts.summaryTransaction')}</SmallTitleText>
          {titleData?.title && (
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-icon-accent/8 px-2.5 py-1">
              <Icon name={operationIcon ?? 'unknownMst'} size={12} className="shrink-0 text-icon-accent" />
              <CaptionText className="truncate text-icon-accent uppercase">{titleData.title}</CaptionText>
            </div>
          )}
        </div>
        <Separator />
        <div className="px-4 py-3">
          <DraftSummary
            multisigName={multisigName ?? ''}
            multisigAccountId={multisigAccountId}
            walletType={walletType ?? undefined}
            chain={chain}
            titleData={summaryTitleData}
            destinationAccountId={destinationAccountId}
            callData={callData || undefined}
            jsonArgs={decodedCallData}
            threshold={threshold}
          />
        </div>
      </div>

      <UnknownRecipientAckBox
        warning={recipientWarning}
        context="draftCreate"
        checked={riskAcknowledged}
        onToggle={onRiskAcknowledgedChange}
      />

      {!callData && (
        <FootnoteText className="text-center text-text-tertiary">
          {t('operations.drafts.summaryNoCallData')}
        </FootnoteText>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-icon-warning/20 bg-icon-warning/8 p-4">
        <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
        <div className="flex flex-col gap-y-1">
          <FootnoteText className="text-text-primary">{t('signingPath.notSignedYet')}</FootnoteText>
          <HelpText className="text-text-secondary">{t('signingPath.notSignedYetHint')}</HelpText>
        </div>
      </div>
    </div>
  );
};
