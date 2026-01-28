import { type ReactElement, useCallback, useRef, useState } from 'react';

import {
  type PromotionEvidenceExistsWarningAlertRef,
  PromotionEvidenceExistsWarningAlert,
} from './PromotionEvidenceExistsWarningAlert';
import { SubmitPeriodWarningAlert } from './SubmitPeriodWarningAlert';

type Props = {
  wish: 'Promotion' | 'Retention';
  onConfirm: () => void;
  children: ReactElement;
};

/**
 * Chains multiple warning alerts together. First checks SubmitPeriodWarning,
 * then PromotionEvidenceExistsWarning. Both alerts can show sequentially if
 * their conditions are met.
 */
export const EvidenceWarningAlerts = ({ wish, onConfirm, children }: Props) => {
  const promotionAlertRef = useRef<PromotionEvidenceExistsWarningAlertRef>(null);
  const [periodWarningPassed, setPeriodWarningPassed] = useState(false);

  const handlePeriodWarningConfirm = useCallback(() => {
    setPeriodWarningPassed(true);
  }, []);

  const handlePromotionWarningConfirm = useCallback(() => {
    setPeriodWarningPassed(false);
    onConfirm();
  }, [onConfirm]);

  return (
    <>
      <SubmitPeriodWarningAlert wish={wish} onConfirm={handlePeriodWarningConfirm}>
        {children}
      </SubmitPeriodWarningAlert>
      {periodWarningPassed && (
        <PromotionEvidenceExistsWarningAlert
          ref={promotionAlertRef}
          wish={wish}
          autoTrigger
          onConfirm={handlePromotionWarningConfirm}
        />
      )}
    </>
  );
};
