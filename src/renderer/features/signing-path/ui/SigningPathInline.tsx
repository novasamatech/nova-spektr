import { type BN } from '@polkadot/util';
import { useUnit } from 'effector-react';
import { Fragment, useCallback, useState } from 'react';

import { type Asset, type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { InputHint } from '@/shared/ui';
import { Popover } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { networkModel } from '@/entities/network';
import { graphModel } from '../model/graph-model';

import { PathArrow } from './PathArrow';
import { PathCard } from './PathCard';
import { PathChip } from './PathChip';
import { PathOverviewBody } from './PathOverviewBody';
import { SigningPathEditModal } from './SigningPathEditModal';
import { type PathNodeView, enrichConnectionEdge, nodeView } from './path-views';

type Props = {
  chainId: ChainId;
  path: PathNode[];
  asset: Asset;
  /**
   * Asset used for fees / multisig deposit (typically the chain's native
   * token). When set and different from `asset`, the source hop shows `asset`
   * balance while the remaining hops show `feeAsset` balance.
   */
  feeAsset?: Asset;
  /**
   * Caller-supplied balance lookup. Returning `null` skips the balance line for
   * that hop, which is appropriate when the account isn't tracked. The
   * `isFeeHop` flag is true for non-source nodes when `feeAsset` is set and
   * differs from `asset` — the caller can use it to fetch the fee-asset balance
   * instead of the operation-asset balance.
   */
  getBalance: (accountId: AccountId, isFeeHop: boolean) => BN | string | null;
  /**
   * AccountIds with active validation errors — any matching node is rendered
   * with a red border (inline cards) and red tint (popover rows) so the user
   * can see exactly which hop is failing.
   */
  errorAccountIds?: ReadonlySet<AccountId>;
  errorText?: string;
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  /** Allow editing the initiator card. Off for wallet-bound forms. */
  editableInitiator?: boolean;
  onChange: (path: PathNode[]) => void;
};

export const SigningPathInline = ({
  chainId,
  path,
  asset,
  feeAsset,
  getBalance,
  errorAccountIds,
  errorText,
  allowedProxyTypes,
  disabledProxyReason,
  editableInitiator = false,
  onChange,
}: Props) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFromIndex, setEditFromIndex] = useState<number | undefined>(undefined);

  const resolveName = useUnit(graphModel.$nameResolver);
  const multisigByAccountId = useUnit(graphModel.$multisigByAccountId);
  const chains = useUnit(networkModel.$chains);
  const chain = chains[chainId];
  const addressPrefix = chain?.addressPrefix;
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  // Override the multisig subtitle with threshold info; nodeView itself
  // handles the signer's ss58 subtitle and proxy/multisig labels.
  const withMultisigThreshold = (view: PathNodeView, node: PathNode): PathNodeView => {
    if (node.kind !== 'multisig') return view;
    const multisig = multisigByAccountId.get(node.accountId);
    if (!multisig) return view;
    return {
      ...view,
      subtitle: t('signingPath.label.multisigThreshold', {
        current: multisig.threshold,
        total: multisig.signatories.length,
      }),
    };
  };

  // Build per-node views once, then run the source/next-hop edge enrichment
  // (drop proxy type from source subtitle, attach it as the next hop's
  // connectionType). Reused by both the popover and the inline cards.
  const enrichedViews = enrichConnectionEdge(
    path
      .map((node, i) => {
        const v = nodeView(node, boundResolve, i, t, addressPrefix);
        return v ? withMultisigThreshold(v, node) : null;
      })
      .filter((v): v is PathNodeView => v !== null),
    path,
    t,
  );

  const openFromCard = (index: number) => {
    setEditFromIndex(index);
    setIsModalOpen(true);
  };
  const openFromChip = () => {
    setEditFromIndex(undefined);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);

  const handleSave = (next: PathNode[]) => {
    onChange(next);
    closeModal();
  };

  const inlineNodes = path;

  // Flag the chip only when an error lands on a node in the current path.
  const hasAnyError = errorAccountIds ? path.some((n) => errorAccountIds.has(n.accountId)) : false;

  return (
    <>
      <div className="flex w-full flex-col gap-y-2">
        <div>
          <Popover enableHover side="bottom" align="end">
            <Popover.Trigger>
              <PathChip hasError={hasAnyError} onClick={openFromChip} />
            </Popover.Trigger>
            <Popover.Content>
              <PathOverviewBody
                path={path}
                views={enrichedViews}
                getBalance={getBalance}
                asset={asset}
                feeAsset={feeAsset}
                errorAccountIds={errorAccountIds}
              />
            </Popover.Content>
          </Popover>
        </div>
        <div className="flex items-stretch gap-2">
          {inlineNodes.map((node, i) => {
            const view = enrichedViews[i];
            if (!view) return null;

            const hasError = errorAccountIds?.has(node.accountId) ?? false;
            const isInitiator = i === 0;
            const handleClick = isInitiator && !editableInitiator ? undefined : () => openFromCard(i);

            return (
              <Fragment key={`inline-${i}-${node.kind}-${node.accountId}`}>
                {i > 0 && <PathArrow />}
                <PathCard view={view} size="sm" position={i} hasError={hasError} onClick={handleClick} />
              </Fragment>
            );
          })}
        </div>
        <InputHint variant="error" active={Boolean(errorText) && hasAnyError}>
          {errorText}
        </InputHint>
      </div>

      <SigningPathEditModal
        isOpen={isModalOpen}
        chainId={chainId}
        initialPath={path}
        editFromIndex={editFromIndex}
        editableInitiator={editableInitiator}
        allowedProxyTypes={allowedProxyTypes}
        disabledProxyReason={disabledProxyReason}
        getOptionBalance={(option) => getBalance(option.accountId, true)}
        optionAsset={feeAsset ?? asset}
        onSave={handleSave}
        onClose={closeModal}
      />
    </>
  );
};
