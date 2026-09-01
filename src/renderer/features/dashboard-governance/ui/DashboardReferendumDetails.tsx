import { useUnit } from 'effector-react';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { type Chain, type ChainId, type ReferendumId } from '@/shared/core';
import { FootnoteText, Loader } from '@/shared/ui';
import { Modal } from '@/shared/ui-kit';
import { networkSelectorModel } from '@/features/governance';
import { GovernanceReferendumDetailsModal, useReferendum } from '@/pages/Governance';

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

  if (!ready) {
    return <LoadingModal onClose={onClose} />;
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
 * the real one is a fill-in rather than a jump from a small box to a large
 * one.
 */
const LoadingModal = ({ onClose }: { onClose: () => void }) => (
  <Modal isOpen size="xl" onToggle={(open) => !open && onClose()}>
    <Modal.Content>
      <div className="flex h-[70vh] w-modal-xl items-center justify-center bg-main-app-background">
        <Loader color="primary" size={32} />
      </div>
    </Modal.Content>
  </Modal>
);
