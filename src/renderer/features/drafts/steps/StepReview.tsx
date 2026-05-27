import { type Chain, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
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
import { Checkbox, Field, Select, TextArea, Tooltip } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { type OperationTitle } from '@/features/multisig-operations';
import { PathBreadcrumb, PathReviewPopover } from '@/features/signing-path';
import { NamedAccount } from '@/widgets/NameResolver';
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
  description: string;
  onDescriptionChanged: (v: string) => void;
  canHaveFinalSigner: boolean;
  isFinalSignerEnabled: boolean;
  finalSignerAccountId: AccountId | null;
  finalSignerCandidates: AccountId[];
  onFinalSignerToggled: (enabled: boolean) => void;
  onFinalSignerSelected: (accountId: AccountId | null) => void;
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
  description,
  onDescriptionChanged,
  canHaveFinalSigner,
  isFinalSignerEnabled,
  finalSignerAccountId,
  finalSignerCandidates,
  onFinalSignerToggled,
  onFinalSignerSelected,
  multisigName,
  multisigAccountId,
  walletType,
  threshold,
}: Props) => {
  const { t } = useI18n();

  const hasFinalSignerCandidates = finalSignerCandidates.length > 0;

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

      {canHaveFinalSigner && (
        <div className="flex flex-col gap-y-2">
          {hasFinalSignerCandidates ? (
            <Checkbox checked={isFinalSignerEnabled} onChange={onFinalSignerToggled}>
              {t('operations.drafts.finalSignerToggle')}
            </Checkbox>
          ) : (
            <Tooltip>
              <Tooltip.Trigger>
                <div className="w-max">
                  <Checkbox checked={false} disabled>
                    {t('operations.drafts.finalSignerToggle')}
                  </Checkbox>
                </div>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('operations.drafts.finalSignerNoCandidates')}</Tooltip.Content>
            </Tooltip>
          )}

          {isFinalSignerEnabled && hasFinalSignerCandidates && (
            <>
              <Select
                placeholder={t('operations.drafts.finalSignerPlaceholder')}
                value={finalSignerAccountId}
                onChange={onFinalSignerSelected}
              >
                {finalSignerCandidates.map((accountId) => (
                  <Select.Item key={accountId} value={accountId}>
                    <NamedAccount accountId={accountId} chain={chain ?? undefined} variant="short" />
                  </Select.Item>
                ))}
              </Select>
              <HelpText className="text-text-secondary">{t('operations.drafts.finalSignerHint')}</HelpText>
            </>
          )}
        </div>
      )}

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
