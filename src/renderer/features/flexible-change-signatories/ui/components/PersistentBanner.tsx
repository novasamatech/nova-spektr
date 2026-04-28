import { useUnit } from 'effector-react';
import { useState } from 'react';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { changeSignatoriesModel } from '../../model/change-signatories-model';

type Props = {
  currentControllerAddress: Address;
  currentSignatories: AccountId[];
  currentThreshold: number;
};

type SideProps = {
  label: string;
  address: Address;
  signatories: AccountId[];
  threshold: number;
  expanded: boolean;
  onToggle: () => void;
};

const truncateAddress = (address: string): string => {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
};

const BannerSide = ({ label, address, signatories, threshold, expanded, onToggle }: SideProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-y-2 rounded-lg border border-container-border bg-block-background-default p-3">
    <FootnoteText className="text-text-tertiary uppercase">{label}</FootnoteText>
    <button
      type="button"
      aria-expanded={expanded}
      className="flex w-full cursor-pointer items-center gap-2 text-left hover:opacity-80"
      onClick={onToggle}
    >
      <Identicon address={address} size={24} background={false} />
      <div className="flex min-w-0 flex-col">
        <FootnoteText className="truncate text-text-primary">{truncateAddress(address)}</FootnoteText>
        <HelpText className="text-text-tertiary">
          {threshold}/{signatories.length}
        </HelpText>
      </div>
    </button>
    {expanded && signatories.length > 0 && (
      <ul className="flex flex-col gap-y-1 border-t border-divider pt-2">
        {signatories.map((accountId) => {
          const addr = toAddress(accountId);
          return (
            <li key={accountId} className="flex items-center gap-1.5">
              <Identicon address={addr} size={16} background={false} />
              <HelpText className="truncate font-mono text-text-secondary">{truncateAddress(addr)}</HelpText>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export const PersistentBanner = ({ currentControllerAddress, currentSignatories, currentThreshold }: Props) => {
  const { t } = useI18n();
  const target = useUnit(changeSignatoriesModel.$selectedTarget);
  const [expanded, setExpanded] = useState<'left' | 'right' | null>(null);

  const targetView = (() => {
    if (!target) return null;
    if (target.kind === 'existing') {
      return {
        address: target.candidate.address,
        signatories: target.candidate.signatories,
        threshold: target.candidate.threshold,
      };
    }
    return {
      address: target.derivedAddress,
      signatories: target.signatories,
      threshold: target.threshold,
    };
  })();

  const toggleLeft = () => setExpanded((prev) => (prev === 'left' ? null : 'left'));
  const toggleRight = () => setExpanded((prev) => (prev === 'right' ? null : 'right'));

  return (
    <div className="flex items-start gap-2">
      <BannerSide
        label={t('flexibleMultisig.editController.banner.was')}
        address={currentControllerAddress}
        signatories={currentSignatories}
        threshold={currentThreshold}
        expanded={expanded === 'left'}
        onToggle={toggleLeft}
      />

      <div className="flex shrink-0 items-center pt-9">
        <span className="text-text-tertiary">→</span>
      </div>

      {targetView ? (
        <BannerSide
          label={t('flexibleMultisig.editController.banner.willBecome')}
          address={targetView.address}
          signatories={targetView.signatories}
          threshold={targetView.threshold}
          expanded={expanded === 'right'}
          onToggle={toggleRight}
        />
      ) : (
        <div className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-container-border bg-block-background-default p-3">
          <FootnoteText className="text-text-tertiary italic">
            {t('flexibleMultisig.editController.banner.notSelected')}
          </FootnoteText>
        </div>
      )}
    </div>
  );
};
