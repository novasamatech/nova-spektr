import { useUnit } from 'effector-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { type Chain, type ChainId, type ReferendumId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { FootnoteText, Loader } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { networkSelectorModel } from '@/features/governance';
import { GovernanceReferendumDetailsModal, useReferendum } from '@/pages/Governance';
import { NETWORK_WAIT_TIMEOUT_MS } from '../lib/constants';

/**
 * The height the real modal takes, so the placeholder standing in for it is the
 * same box. Spelled as a class because Tailwind reads the literal from source.
 */
const DETAILS_BODY_HEIGHT_CLASS = 'h-[70vh]';

type Props = {
  chainId: ChainId;
  referendumId: ReferendumId;
  onClose: () => void;
};

/**
 * Mounts the app's referendum modal outside the Governance page.
 *
 * The modal, its vote flows and every governance aggregate behind it read the
 * chain from `networkSelectorModel` — a single global selection — so the row's
 * chain is selected first and nothing renders until the selector agrees. The
 * selection is put back to what it was once the modal is gone: the dashboard
 * borrowed it for one modal, and the Governance page should open on the chain
 * the user last chose there, not on the one they last peeked at here.
 */
export const DashboardReferendumDetails = ({ chainId, referendumId, onClose }: Props) => {
  const { t } = useI18n();
  const [selectedChainId, network, selectNetwork] = useUnit([
    networkSelectorModel.$governanceChainId,
    networkSelectorModel.$network,
    networkSelectorModel.events.selectNetwork,
  ]);

  // The chain the user had selected before this modal borrowed the selector.
  const previousChainId = useRef<ChainId | null>(selectedChainId);

  useLayoutEffect(() => {
    selectNetwork(chainId);
  }, [chainId, selectNetwork]);

  // Restored after unmount, not during it: the governance flow gate (a layout
  // effect in the child) closes and unsubscribes on unmount, and it must do so
  // with the modal's chain still selected. Subscriptions only ever start on
  // that gate opening, so switching the selector back once it is closed
  // subscribes nothing.
  useEffect(() => {
    const previous = previousChainId.current;

    return () => {
      if (previous && previous !== chainId) {
        setTimeout(() => selectNetwork(previous), 0);
      }
    };
  }, [chainId, selectNetwork]);

  // `useGate` (inside `useReferendum`) opens the governance flow gate from a
  // layout effect, and React runs child layout effects before the parent's — so
  // the gate is kept unmounted until the selector already reports our chain,
  // otherwise the gate would snapshot the previous network.
  const ready = selectedChainId === chainId && network !== null;

  // A chain that never connects leaves the selector unresolved forever, and the
  // spinner has nothing to say about it. After a bounded wait the modal says
  // what it is waiting for, so the close button is a choice rather than the
  // only thing on screen.
  const [waitedOut, setWaitedOut] = useState(false);

  useEffect(() => {
    if (ready) return;

    setWaitedOut(false);
    const timeout = setTimeout(() => setWaitedOut(true), NETWORK_WAIT_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [ready]);

  if (!ready) {
    return (
      <LoadingModal hint={waitedOut ? t('dashboard.referendums.hint.chainDisconnected') : null} onClose={onClose} />
    );
  }

  return <ReferendumBody chain={network.chain} referendumId={referendumId} onClose={onClose} />;
};

type BodyProps = {
  chain: Chain;
  referendumId: ReferendumId;
  onClose: () => void;
};

const ReferendumBody = ({ chain, referendumId, onClose }: BodyProps) => {
  const referendum = useReferendum(referendumId);

  if (!referendum) {
    return <LoadingModal onClose={onClose} />;
  }

  return (
    <GovernanceReferendumDetailsModal
      referendum={referendum}
      chainId={chain.chainId}
      titleBadge={<ChainBadge chain={chain} />}
      showVotingAs
      onClose={onClose}
    />
  );
};

/**
 * The chain the referendum lives on. On the Governance page the network
 * selector says it; opened from the dashboard's mixed-chain list, the modal has
 * to say it itself.
 */
const ChainBadge = ({ chain }: { chain: Chain }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-input-background-disabled py-0.5 pr-2 pl-1">
    <img src={chain.icon} alt="" width={16} height={16} className="h-4 w-4" />
    <FootnoteText className="text-text-secondary">{chain.name}</FootnoteText>
  </span>
);

/**
 * Sized like the modal it stands in for — `xl`, full height — so the swap to
 * the real one is a fill-in rather than a jump from a small box to a large one.
 * The hint, when there is one, says why the wait is not ending.
 */
const LoadingModal = ({ hint, onClose }: { hint?: string | null; onClose: () => void }) => (
  <Modal isOpen size="xl" onToggle={(open) => !open && onClose()}>
    <Modal.Content>
      <div
        className={`flex w-modal-xl flex-col items-center justify-center gap-3 bg-main-app-background ${DETAILS_BODY_HEIGHT_CLASS}`}
      >
        <Loader color="primary" size={32} />
        {hint && <FootnoteText className="text-text-tertiary">{hint}</FootnoteText>}
      </div>
    </Modal.Content>
  </Modal>
);
