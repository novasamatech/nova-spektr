import { useState } from 'react';
import { Trans } from 'react-i18next';

import { useI18n } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { taskVotingDetailsActionSlot } from '@/features/fellowship-tasks';
import { referendumDetalsPageRouteSlot } from '@/pages/Fellowship/ui/FellowshipReferendumDetails';

import { ReferendumDetailsModal, additionalInfoSlot, referendumActionsSlot } from './components/ReferendumDetailsModal';
import { ReferendumTrackInfo } from './components/shared/ReferendumTrackInfo';
import { ReferendumVoteChart } from './components/shared/ReferendumVoteChart';
import { ReferendumVotingStatusBadge } from './components/shared/ReferendumVotingStatusBadge';
import { referendumsDetailsFeature } from './model/feature';

export { referendumsDetailsFeature, additionalInfoSlot, referendumActionsSlot };

export const fellowshipReferendumDetailsF = {
  views: {
    ReferendumVoteChart,
    ReferendumTrackInfo,
    ReferendumVotingStatusBadge,
  },
};

referendumsDetailsFeature.inject(taskVotingDetailsActionSlot, ({ referendumId }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <span className="flex whitespace-pre text-button-large">
        <Trans
          t={t}
          i18nKey="fellowship.tasks.task.anyReferendum.viewEvidence"
          components={{
            a: <Button variant="text" className="inline-flex h-auto p-0" onClick={() => setOpen(true)} />,
          }}
        />
      </span>
      <ReferendumDetailsModal referendumId={referendumId} isOpen={open} onToggle={setOpen} />
    </>
  );
});

referendumsDetailsFeature.inject(referendumDetalsPageRouteSlot, ({ referendumId, isOpen, onToggle }) => {
  return <ReferendumDetailsModal referendumId={referendumId} isOpen={isOpen} onToggle={onToggle} />;
});
