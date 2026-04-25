import { type Chain, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Field, TextArea } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { type OperationTitle } from '@/features/multisig-operations';
import { DraftSummary } from '../components/DraftSummary';
import { PathBreadcrumb } from '../components/signing-path/PathBreadcrumb';
import { PathReviewPopover } from '../components/signing-path/PathReviewPopover';

type Props = {
  path: PathNode[];
  chain: Chain | null;
  callData: string;
  decodedCallData: object | null;
  titleData: OperationTitle | null;
  destinationAccountId: AccountId | null;
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
  destinationAccountId,
  description,
  onDescriptionChanged,
  multisigName,
  multisigAccountId,
  walletType,
  threshold,
}: Props) => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-5">
      {path.length > 0 && (
        <section className="flex flex-col gap-y-2">
          <div className="flex items-center justify-between">
            <CaptionText className="text-text-tertiary uppercase">
              {t('operations.drafts.signingPath.signingPath')}
            </CaptionText>
            <div className="flex items-center gap-3">
              <HelpText className="text-text-tertiary">
                {t('operations.drafts.signingPath.hopsCount', { count: path.length })}
              </HelpText>
              <PathReviewPopover path={path} />
            </div>
          </div>
          <PathBreadcrumb path={path} size="sm" />
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
          onChange={onDescriptionChanged}
        />
      </Field>

      <DraftSummary
        multisigName={multisigName ?? ''}
        multisigAccountId={multisigAccountId}
        walletType={walletType ?? undefined}
        chain={chain}
        titleData={titleData}
        destinationAccountId={destinationAccountId}
        callData={callData || undefined}
        jsonArgs={decodedCallData}
        threshold={threshold}
      />

      {!callData && (
        <FootnoteText className="text-center text-text-tertiary">
          {t('operations.drafts.summaryNoCallData')}
        </FootnoteText>
      )}

      <div className="flex items-start gap-3 rounded-lg border border-icon-warning/20 bg-icon-warning/8 p-4">
        <Icon name="warn" size={16} className="mt-0.5 shrink-0 text-icon-warning" />
        <div className="flex flex-col gap-y-1">
          <FootnoteText className="text-text-primary">{t('operations.drafts.signingPath.notSignedYet')}</FootnoteText>
          <HelpText className="text-text-secondary">{t('operations.drafts.signingPath.notSignedYetHint')}</HelpText>
        </div>
      </div>
    </div>
  );
};
