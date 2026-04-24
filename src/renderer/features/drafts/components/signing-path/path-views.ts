import { type ReactNode } from 'react';

import { type WalletType } from '@/shared/core';
import { truncate } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

export type PathCardSize = 'sm' | 'md';

export type PathNodeView = {
  label: string;
  title: string;
  subtitle: string;
  address?: AccountId;
  walletType?: WalletType | null;
};

/**
 * Converts a PathNode into a PathNodeView for display.
 *
 * @param node - The path node to convert
 * @param nameByAccountId - Map from account ID to contact name
 * @param position - Zero-based index in the path
 */
export const nodeView = (
  node: PathNode,
  nameByAccountId: Record<string, string>,
  position: number,
): PathNodeView | null => {
  if (node.kind === 'proxied') {
    const name = nameByAccountId[node.accountId] ?? truncate(node.accountId, 6, 6);

    return {
      label: 'Source',
      title: name,
      subtitle: node.proxyType ? `Proxied · ${node.proxyType}` : 'Proxied',
      address: node.accountId as AccountId,
      walletType: null,
    };
  }

  if (node.kind === 'multisig') {
    const name = nameByAccountId[node.accountId] ?? truncate(node.accountId, 6, 6);

    return {
      label: position === 0 ? 'Source' : 'via Multisig',
      title: name,
      subtitle: 'Multisig',
      address: node.accountId as AccountId,
      walletType: null,
    };
  }

  // kind === 'signer'
  const name = nameByAccountId[node.accountId] ?? truncate(node.accountId, 6, 6);

  return {
    label: 'Initiator',
    title: name,
    subtitle: truncate(node.accountId, 6, 6),
    address: node.accountId as AccountId,
    walletType: null,
  };
};

/**
 * Maps PathNodeView[] into breadcrumb card elements, automatically collapsing
 * middle hops into an EllipsisCard when more than 3 views are present.
 *
 * Accepts card/arrow/ellipsis factory functions so it stays free of React
 * imports (the factories live in PathBreadcrumb.tsx which does import React).
 */
export type BreadcrumbCardFactories = {
  renderCard: (view: PathNodeView, index: number, total: number, onClick?: () => void) => ReactNode;
  renderArrow: (key: string) => ReactNode;
  renderEllipsis: (hiddenViews: PathNodeView[], key: string) => ReactNode;
};

export const renderBreadcrumbCards = (
  views: PathNodeView[],
  factories: BreadcrumbCardFactories,
  onNodeClick?: (index: number) => void,
): ReactNode[] => {
  const MAX = 3;

  if (views.length <= MAX) {
    return views.flatMap((v, i) => {
      const arrow = i > 0 ? [factories.renderArrow(`arrow-${i}`)] : [];

      return [...arrow, factories.renderCard(v, i, views.length, onNodeClick ? () => onNodeClick(i) : undefined)];
    });
  }

  const first = views[0];
  const hidden = views.slice(1, views.length - 1);
  const last = views[views.length - 1];
  const elements: ReactNode[] = [];

  if (first) {
    elements.push(factories.renderCard(first, 0, views.length, onNodeClick ? () => onNodeClick(0) : undefined));
  }
  elements.push(factories.renderArrow('arrow-first'));
  elements.push(factories.renderEllipsis(hidden, 'ellipsis'));
  elements.push(factories.renderArrow('arrow-last'));
  if (last) {
    elements.push(
      factories.renderCard(
        last,
        views.length - 1,
        views.length,
        onNodeClick ? () => onNodeClick(views.length - 1) : undefined,
      ),
    );
  }

  return elements;
};
