import { useUnit } from 'effector-react';
import { useCallback, useState } from 'react';

import { type ChainId } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { CaptionText, FootnoteText, HelpText, Icon } from '@/shared/ui';
import { WalletAccountIcon } from '@/shared/ui-entities';
import { Popover } from '@/shared/ui-kit';
import { type PathNode } from '@/domains/backend';
import { graphModel } from '../model/graph-model';

import { SigningPathEditModal } from './SigningPathEditModal';
import { nodeView } from './path-views';

type Props = {
  chainId: ChainId;
  path: PathNode[];
  allowedProxyTypes?: readonly string[];
  disabledProxyReason?: string;
  onChange: (path: PathNode[]) => void;
};

export const SigningPathControl = ({ chainId, path, allowedProxyTypes, disabledProxyReason, onChange }: Props) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const resolveName = useUnit(graphModel.$nameResolver);
  const boundResolve = useCallback((accountId: AccountId) => resolveName(accountId, chainId), [resolveName, chainId]);

  // Hide for trivial paths — single signatory in a non-multisig flow needs no
  // visualization, and the legacy signatory dropdown already shows the leaf.
  if (path.length < 2) return null;

  const handleSave = (next: PathNode[]) => {
    onChange(next);
    setIsModalOpen(false);
  };

  return (
    <>
      <Popover enableHover side="bottom" align="start">
        <Popover.Trigger>
          <button
            type="button"
            className="flex w-fit shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-container-border bg-white px-2.5 py-1 transition-colors hover:bg-action-background-hover"
            onClick={(e) => {
              // Chip lives inside a <label> (Field) — stop the click from
              // bubbling to the wrapping label, which would otherwise also
              // trigger focus on the signatory dropdown.
              e.stopPropagation();
              e.preventDefault();
              setIsModalOpen(true);
            }}
          >
            <Icon name="details" size={12} className="text-icon-accent" />
            <CaptionText className="text-icon-accent uppercase">{t('signingPath.signingPath')}</CaptionText>
          </button>
        </Popover.Trigger>
        <Popover.Content>
          <div className="flex w-[340px] flex-col gap-y-3 p-4">
            <div className="flex items-center justify-between">
              <CaptionText className="text-text-tertiary uppercase">{t('signingPath.fullSigningPath')}</CaptionText>
              <HelpText className="text-text-tertiary">
                {t('signingPath.hopsCount', { count: Math.max(0, path.length - 1) })}
              </HelpText>
            </div>
            <div className="flex flex-col">
              {path.map((node, idx) => {
                const v = nodeView(node, boundResolve, idx, t);
                if (!v) return null;
                const isLast = idx === path.length - 1;

                return (
                  <div key={`${idx}-${node.kind}-${node.accountId}`} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-container-border bg-white">
                        <CaptionText className="text-text-secondary">{idx + 1}</CaptionText>
                      </div>
                      {!isLast && <div className="h-8 w-px bg-shade-12" />}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col pb-4">
                      <CaptionText className="text-text-tertiary uppercase">{v.label}</CaptionText>
                      <div className="mt-1 flex min-w-0 items-center gap-2">
                        {v.address && (
                          <WalletAccountIcon
                            address={toAddress(v.address)}
                            type={v.walletType ?? null}
                            size={22}
                            iconSize={10}
                          />
                        )}
                        <div className="flex min-w-0 flex-col">
                          <FootnoteText className="truncate text-text-primary">{v.title}</FootnoteText>
                          <HelpText className="truncate text-text-tertiary">{v.subtitle}</HelpText>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover>

      <SigningPathEditModal
        isOpen={isModalOpen}
        chainId={chainId}
        initialPath={path}
        allowedProxyTypes={allowedProxyTypes}
        disabledProxyReason={disabledProxyReason}
        onSave={handleSave}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
