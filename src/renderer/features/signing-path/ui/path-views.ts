import { type TFunction } from 'i18next';
import { type ReactNode } from 'react';

import { WalletType } from '@/shared/core';
import { toAddress, toShortAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { type PathNode } from '@/domains/backend';

export type PathCardSize = 'sm' | 'md';

export type PathNodeView = {
  label: string;
  title: string;
  subtitle: string;
  address?: AccountId;
  walletType?: WalletType | null;
  /**
   * Optional proxy type carried from the source node, appended to the label of
   * the next hop (e.g. "VIA MULTISIG · Any") so the inline view can show the
   * connection type without rendering the source itself.
   */
  connectionType?: string;
};

export const nodeView = (
  node: PathNode,
  resolveName: (accountId: AccountId) => string,
  position: number,
  t: TFunction,
  addressPrefix?: number,
): PathNodeView | null => {
  const accountId = node.accountId;
  const name = resolveName(accountId);
  const address = accountId;

  if (node.kind === 'proxied') {
    return {
      label: t('signingPath.label.source'),
      title: name,
      subtitle: node.proxyType
        ? t('signingPath.label.proxiedWithType', { type: node.proxyType })
        : t('signingPath.label.proxied'),
      address,
      walletType: WalletType.PROXIED,
    };
  }

  if (node.kind === 'multisig') {
    return {
      label: position === 0 ? t('signingPath.label.source') : t('signingPath.label.viaMultisig'),
      title: name,
      subtitle: t('signingPath.label.multisig'),
      address,
      walletType: WalletType.MULTISIG,
    };
  }

  return {
    label: t('signingPath.label.initiator'),
    title: name,
    subtitle: toShortAddress(toAddress(node.accountId, { prefix: addressPrefix })),
    address,
    walletType: null,
  };
};

/**
 * Move a proxied source's `proxyType` from its own subtitle onto the next hop's
 * `connectionType`. Source then shows just "Proxied" (uncluttered) and the type
 * sits on the edge it actually describes — matches the inline transfer card
 * layout.
 */
export const enrichConnectionEdge = (views: PathNodeView[], path: PathNode[], t: TFunction): PathNodeView[] => {
  const source = path[0];
  if (!source || source.kind !== 'proxied' || !source.proxyType) return views;

  return views.map((v, idx) => {
    if (idx === 0) return { ...v, subtitle: t('signingPath.label.proxied') };
    if (idx === 1) return { ...v, connectionType: source.proxyType };
    return v;
  });
};

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
