import { useUnit } from 'effector-react';
import { type ReactNode, useState } from 'react';

import { type Address } from '@/shared/core';
import { useI18n } from '@/shared/i18n';
import { cnTw, toAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';
import { FootnoteText, HelpText, StatusLabel } from '@/shared/ui';
import { Identicon } from '@/shared/ui-entities';
import { useAddressName } from '../../lib/use-address-name';
import { changeSignatoriesModel } from '../../model/change-signatories-model';

type Props = {
  currentControllerAddress: Address;
  currentSignatories: AccountId[];
  currentThreshold: number;
};

type Tone = 'muted' | 'neutral' | 'accent';

type SideProps = {
  label: string;
  state?: ReactNode;
  address: Address;
  signatories: AccountId[];
  threshold: number;
  expanded: boolean;
  onToggle: () => void;
  tone: Tone;
};

const containerToneStyle: Record<Tone, string> = {
  muted: 'border-container-border bg-block-background-default/70',
  neutral: 'border-container-border bg-block-background-default',
  accent: 'border-icon-accent/40 bg-block-background-default shadow-card-shadow',
};

const truncate = (address: string) => {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
};

const BannerSide = ({ label, state, address, signatories, threshold, expanded, onToggle, tone }: SideProps) => {
  const chain = useUnit(changeSignatoriesModel.$chain);
  const name = useAddressName(address, chain);

  return (
    <div
      className={cnTw(
        'flex min-h-[96px] min-w-0 flex-1 flex-col gap-y-2 rounded-lg border p-3',
        containerToneStyle[tone],
      )}
    >
      <div className="flex h-5 items-center justify-between gap-2">
        <FootnoteText className="text-text-tertiary uppercase">{label}</FootnoteText>
        {state}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        className="flex w-full cursor-pointer items-center gap-2 text-left hover:opacity-80"
        onClick={onToggle}
      >
        <Identicon address={address} size={20} background={false} />
        <div className="flex min-w-0 flex-1 flex-col">
          {name ? (
            <>
              <FootnoteText className="truncate text-text-primary">{name}</FootnoteText>
              <HelpText className="truncate text-text-tertiary">{truncate(address)}</HelpText>
            </>
          ) : (
            <FootnoteText className="truncate text-text-primary">{truncate(address)}</FootnoteText>
          )}
        </div>
        <FootnoteText className="shrink-0 font-semibold text-text-primary">
          {threshold}/{signatories.length}
        </FootnoteText>
      </button>
      {expanded && signatories.length > 0 && <ExpandedSignatories signatories={signatories} />}
    </div>
  );
};

const ExpandedSignatories = ({ signatories }: { signatories: AccountId[] }) => {
  const chain = useUnit(changeSignatoriesModel.$chain);

  return (
    <ul className="flex flex-col gap-y-1 border-t border-divider pt-2">
      {signatories.map((accountId) => {
        const addr = toAddress(accountId, { prefix: chain?.addressPrefix });
        return (
          <li key={accountId}>
            <SignatoryRow address={addr} />
          </li>
        );
      })}
    </ul>
  );
};

const SignatoryRow = ({ address }: { address: Address }) => {
  const chain = useUnit(changeSignatoriesModel.$chain);
  const name = useAddressName(address, chain);

  return (
    <div className="flex items-center gap-1.5">
      <Identicon address={address} size={16} background={false} />
      {name ? (
        <FootnoteText className="truncate text-text-secondary">{name}</FootnoteText>
      ) : (
        <HelpText className="truncate font-mono text-text-secondary">{address}</HelpText>
      )}
    </div>
  );
};

export const PersistentBanner = ({ currentControllerAddress, currentSignatories, currentThreshold }: Props) => {
  const { t } = useI18n();
  const target = useUnit(changeSignatoriesModel.$selectedTarget);
  const [expanded, setExpanded] = useState<'left' | 'right' | null>(null);

  const newStateLabel = (() => {
    if (!target) {
      return <StatusLabel variant="waiting" title={t('flexibleMultisig.editController.banner.stateNoChanges')} />;
    }
    if (target.kind === 'modify') {
      return <StatusLabel variant="success" title={t('flexibleMultisig.editController.banner.stateModify')} />;
    }
    const titleKey =
      target.candidate.source === 'wallet'
        ? 'flexibleMultisig.editController.banner.stateWallet'
        : 'flexibleMultisig.editController.banner.stateAddressBook';
    return <StatusLabel variant="success" title={t(titleKey)} />;
  })();

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
        tone="muted"
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
          tone="accent"
          state={newStateLabel}
          label={t('flexibleMultisig.editController.banner.willBecome')}
          address={targetView.address}
          signatories={targetView.signatories}
          threshold={targetView.threshold}
          expanded={expanded === 'right'}
          onToggle={toggleRight}
        />
      ) : (
        <div className="flex min-h-[96px] min-w-0 flex-1 flex-col gap-y-2 rounded-lg border border-dashed border-icon-accent/40 bg-block-background-default p-3">
          <div className="flex h-5 items-center justify-between gap-2">
            <FootnoteText className="text-text-tertiary uppercase">
              {t('flexibleMultisig.editController.banner.willBecome')}
            </FootnoteText>
            {newStateLabel}
          </div>
          <FootnoteText className="text-text-tertiary italic">
            {t('flexibleMultisig.editController.banner.notSelected')}
          </FootnoteText>
        </div>
      )}
    </div>
  );
};
