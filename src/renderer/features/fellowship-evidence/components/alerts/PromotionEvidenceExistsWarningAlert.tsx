import { Slot } from '@radix-ui/react-slot';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';

import { useI18n } from '@/shared/i18n';
import { nullable } from '@/shared/lib/utils';
import { FootnoteText } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui-kit';
import { useFellowshipMemberEvidence } from '@/aggregates/fellowship-member';

type RadixIntegration = Pick<
  HTMLAttributes<Element>,
  | 'onClick'
  | 'onMouseDown'
  | 'onMouseUp'
  | 'onMouseEnter'
  | 'onMouseLeave'
  | 'onPointerDown'
  | 'onPointerUp'
  | 'onPointerMove'
  | 'onPointerLeave'
>;

export type PromotionEvidenceExistsWarningAlertRef = {
  trigger: () => void;
};

type Props = RadixIntegration & {
  wish: 'Promotion' | 'Retention';
  onConfirm: () => void;
  children?: ReactElement;
  autoTrigger?: boolean;
};

const PromotionEvidenceExistsWarningAlertInner = (
  { wish, onConfirm, children, autoTrigger, ...radix }: Props,
  ref: ForwardedRef<PromotionEvidenceExistsWarningAlertRef>,
) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const { data: evidence } = useFellowshipMemberEvidence();

  const shouldShowWarning = wish === 'Retention' && !nullable(evidence) && evidence.wish === 'Promotion';

  const trigger = () => {
    if (shouldShowWarning) {
      setIsOpen(true);
    } else {
      onConfirm();
    }
  };

  useImperativeHandle(ref, () => ({ trigger }));

  useEffect(() => {
    if (autoTrigger) {
      trigger();
    }
  }, [autoTrigger]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trigger();
    radix.onClick?.(e);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirm();
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <>
      {children && (
        <Slot {...radix} onClick={handleClick}>
          {children}
        </Slot>
      )}
      <ConfirmModal
        isOpen={isOpen}
        title={t('fellowship.salary.evidence.promotionEvidenceExistsWarning.title')}
        description={
          <FootnoteText className="whitespace-pre-line text-text-tertiary" align="center">
            {t('fellowship.salary.evidence.promotionEvidenceExistsWarning.description')}
          </FootnoteText>
        }
        cancelText={t('fellowship.salary.evidence.promotionEvidenceExistsWarning.cancel')}
        confirmText={t('fellowship.salary.evidence.promotionEvidenceExistsWarning.submit')}
        onToggle={setIsOpen}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export const PromotionEvidenceExistsWarningAlert = forwardRef(PromotionEvidenceExistsWarningAlertInner);
