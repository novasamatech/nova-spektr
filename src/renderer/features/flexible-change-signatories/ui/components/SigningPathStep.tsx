import { type ReactNode, useState } from 'react';

import { type Address, type WalletType } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw } from '@/shared/lib/utils';
import { BodyText, Button, CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { Identicon, WalletIcon } from '@/shared/ui-entities';
import { Popover } from '@/shared/ui-kit';
import { type PathNode, isComplete } from '../../lib/path';

// ─── Internal view type ───────────────────────────────────────────────────────

type PathNodeView = {
  label: string;
  title: string;
  address: Address;
  walletType?: WalletType;
};

/**
 * Map a PathNode to display-only data. Because PathNode already carries address
 *
 * - Name, no lookup is needed.
 */
const toNodeView = (node: PathNode): PathNodeView => {
  const labelMap: Record<PathNode['kind'], string> = {
    source: 'Source',
    multisig: 'via Multisig',
    proxied: 'via Proxy',
    signer: 'Signer',
  };

  return {
    label: labelMap[node.kind],
    title: node.name,
    address: node.address,
    // walletType is intentionally omitted — PathNode doesn't carry it yet.
    // When integration wires real wallet data, add walletType to PathNode and update here.
  };
};

// ─── PathCard ────────────────────────────────────────────────────────────────

type PathCardSize = 'sm' | 'md';

type PathCardProps = {
  view: PathNodeView;
  size?: PathCardSize;
  onClick?: () => void;
};

const PathCard = ({ view, size = 'md', onClick }: PathCardProps) => {
  const inner = (
    <div
      className={cnTw(
        'flex min-w-0 flex-1 flex-col rounded-lg border border-container-border bg-white',
        size === 'md' ? 'gap-y-2.5 p-4' : 'gap-y-1.5 px-3.5 py-2.5',
        onClick && 'cursor-pointer transition-colors hover:bg-action-background-hover',
      )}
    >
      <CaptionText className="text-text-tertiary uppercase">{view.label}</CaptionText>
      <div className="flex min-w-0 items-center gap-2">
        <NodeIdenticon address={view.address} walletType={view.walletType} size={size === 'md' ? 28 : 22} />
        <div className="flex min-w-0 flex-col">
          <BodyText className="truncate text-text-primary">{view.title}</BodyText>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className="flex min-w-0 flex-1" onClick={onClick}>
        {inner}
      </button>
    );
  }

  return inner;
};

// ─── NodeIdenticon ────────────────────────────────────────────────────────────

const NodeIdenticon = ({
  address,
  walletType,
  size = 28,
  badgeSize = 12,
}: {
  address: Address;
  walletType?: WalletType;
  size?: number;
  badgeSize?: number;
}) => (
  <div className="relative shrink-0">
    <Identicon address={address} size={size} theme="polkadot" />
    {walletType && (
      <div className="absolute -right-0.5 -bottom-0.5">
        <WalletIcon type={walletType} size={badgeSize} />
      </div>
    )}
  </div>
);

// ─── PathArrow ────────────────────────────────────────────────────────────────

const PathArrow = () => (
  <div className="flex shrink-0 items-center">
    <Icon name="right" size={16} className="text-text-tertiary" />
  </div>
);

// ─── EllipsisCard ─────────────────────────────────────────────────────────────

const EllipsisCard = ({ hiddenViews, size = 'sm' }: { hiddenViews: PathNodeView[]; size?: PathCardSize }) => (
  <Popover>
    <Popover.Trigger>
      <button
        type="button"
        className={cnTw(
          'flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-container-border bg-white transition-colors hover:bg-action-background-hover',
          size === 'md' ? 'min-w-[68px] px-3 py-4' : 'min-w-[52px] px-3 py-2.5',
        )}
      >
        <CaptionText className="text-text-tertiary uppercase">+{hiddenViews.length}</CaptionText>
        <div className="flex items-center gap-0.5">
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
          <div className="h-1 w-1 rounded-full bg-text-tertiary" />
        </div>
      </button>
    </Popover.Trigger>
    <Popover.Content>
      <div className="flex w-[300px] flex-col gap-y-2 p-3">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <CaptionText className="text-text-tertiary uppercase">Full path</CaptionText>
        <div className="flex flex-col gap-y-2">
          {hiddenViews.map((v, i) => (
            <div key={`${v.label}-${i}`} className="flex items-center gap-2.5">
              <NodeIdenticon address={v.address} walletType={v.walletType} size={24} badgeSize={10} />
              <div className="flex min-w-0 flex-col">
                <CaptionText className="text-text-tertiary uppercase">{v.label}</CaptionText>
                <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Popover.Content>
  </Popover>
);

// ─── renderBreadcrumbCards ────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

const renderBreadcrumbCards = (
  views: PathNodeView[],
  size: PathCardSize,
  onNodeClick?: (index: number) => void,
): ReactNode[] => {
  if (views.length <= MAX_VISIBLE) {
    return views.flatMap((v, i) => {
      const arrow = i > 0 ? [<PathArrow key={`arrow-${v.label}-${i}`} />] : [];

      return [
        ...arrow,
        <PathCard
          key={`card-${v.label}-${i}`}
          view={v}
          size={size}
          onClick={onNodeClick ? () => onNodeClick(i) : undefined}
        />,
      ];
    });
  }

  const first = views[0];
  const hidden = views.slice(1, views.length - 1);
  const last = views[views.length - 1];
  const elements: ReactNode[] = [];

  if (first) {
    elements.push(
      <PathCard key="first" view={first} size={size} onClick={onNodeClick ? () => onNodeClick(0) : undefined} />,
    );
  }
  elements.push(<PathArrow key="arrow-first" />);
  elements.push(<EllipsisCard key="ellipsis" hiddenViews={hidden} size={size} />);
  elements.push(<PathArrow key="arrow-last" />);
  if (last) {
    elements.push(
      <PathCard
        key="last"
        view={last}
        size={size}
        onClick={onNodeClick ? () => onNodeClick(views.length - 1) : undefined}
      />,
    );
  }

  return elements;
};

// ─── PathBreadcrumb ───────────────────────────────────────────────────────────

type PathBreadcrumbProps = {
  path: PathNode[];
  size?: PathCardSize;
  onNodeClick?: (index: number) => void;
};

const PathBreadcrumb = ({ path, size = 'sm', onNodeClick }: PathBreadcrumbProps) => {
  const views = path.map(toNodeView);

  if (views.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-shade-12 bg-block-background-default px-4 py-6">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <FootnoteText className="text-text-tertiary">Pick a source account to start</FootnoteText>
      </div>
    );
  }

  return (
    <div className="flex items-stretch gap-2 rounded-lg bg-block-background-default p-3">
      {renderBreadcrumbCards(views, size, onNodeClick)}
    </div>
  );
};

// ─── PathComplete banner ──────────────────────────────────────────────────────

const PathCompleteBanner = () => {
  const { t } = useI18n();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-text-positive/30 bg-text-positive/8 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-positive">
        <Icon name="checkmark" size={16} className="text-white" />
      </div>
      <div className="flex flex-col gap-y-0.5">
        <FootnoteText className="text-text-primary">
          {t('flexibleMultisig.editController.signingPath.complete')}
        </FootnoteText>
        <HelpText className="text-text-secondary">
          {t('flexibleMultisig.editController.signingPath.completeHint')}
        </HelpText>
      </div>
    </div>
  );
};

// ─── StubPickerSection ────────────────────────────────────────────────────────

/**
 * @dev-stub Real path-picker integration is a follow-up task.
 * This section shows a placeholder until wallet/proxy data wiring is complete.
 */
const StubPickerSection = ({ path, onStubFinish }: { path: PathNode[]; onStubFinish: (path: PathNode[]) => void }) => {
  const source = path[0];

  const handleStubFinish = () => {
    if (!source) return;
    // DEV-ONLY STUB: sets path to [source, fake signer] so downstream
    // Task 10 wiring can be exercised without real wallet data.
    // Remove when real picker integration is complete.
    const fakeSigner: PathNode = {
      kind: 'signer',
      id: `stub-signer-${source.id}`,
      address: source.address,
      name: `${source.name} (stub signer)`,
    };
    onStubFinish([source, fakeSigner]);
  };

  return (
    <div className="flex flex-col gap-y-3 rounded-lg border border-dashed border-container-border bg-block-background-default p-4">
      <FootnoteText className="text-text-tertiary">
        {/* eslint-disable-next-line i18next/no-literal-string */}
        {/* TODO: real path picker — wire wallet/proxy data in follow-up task */}
        (real path picker — wired in follow-up)
      </FootnoteText>
      {/* DEV-ONLY stub affordance: lets downstream tasks exercise the flow */}
      {/* eslint-disable i18next/no-literal-string */}
      <button
        type="button"
        className="self-start rounded-md bg-icon-accent/12 px-3 py-1.5 text-footnote text-icon-accent transition-colors hover:bg-icon-accent/20"
        onClick={handleStubFinish}
      >
        [DEV] Skip to mock signer
      </button>
      {/* eslint-enable i18next/no-literal-string */}
    </div>
  );
};

// ─── SigningPathStep ──────────────────────────────────────────────────────────

type Props = {
  currentController: { address: Address; name: string };
  onConfirm: (path: PathNode[]) => void;
};

export const SigningPathStep = ({ currentController, onConfirm }: Props) => {
  const { t } = useI18n();

  const [path, setPath] = useState<PathNode[]>([
    {
      kind: 'source',
      id: currentController.address,
      address: currentController.address,
      name: currentController.name,
    },
  ]);

  const complete = isComplete(path);
  const last = path[path.length - 1];

  const truncateTo = (index: number) => setPath(path.slice(0, index + 1));

  return (
    <div className="flex flex-col gap-y-4">
      <PathBreadcrumb path={path} onNodeClick={truncateTo} />

      {complete ? <PathCompleteBanner /> : last && <StubPickerSection path={path} onStubFinish={setPath} />}

      <Button size="md" className="self-end" disabled={!complete} onClick={() => onConfirm(path)}>
        {t('flexibleMultisig.editController.signingPath.next')}
      </Button>
    </div>
  );
};
