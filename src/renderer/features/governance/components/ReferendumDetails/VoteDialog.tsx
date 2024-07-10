import { PropsWithChildren } from 'react';
import { Trans } from 'react-i18next';

import { Chain, Referendum } from '@shared/core';
import { BaseModal, FootnoteText, HeaderTitleText, Icon, LabelHelpBox, Popover, SmallTitleText } from '@shared/ui';
import { ChainIcon } from '@entities/chain';
import { IconNames } from '@shared/ui/Icon/data';
import { useI18n } from '@app/providers';

type Props = {
  referendum: Referendum;
  chain: Chain;
  onClose: VoidFunction;
};

const VoteButton = ({ icon, children, onClick }: PropsWithChildren<{ icon: IconNames; onClick: VoidFunction }>) => {
  return (
    <button
      className="appearance-none flex flex-col items-center gap-2 px-6 py-4 rounded-lg bg-secondary-button-background text-text-tertiary grow basis-0"
      onClick={onClick}
    >
      <Icon name={icon} size={16} className="text-icon-default" />
      <span className="text-button-large">{children}</span>
    </button>
  );
};

const AboutVoting = () => {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-2 p-4 whitespace-pre-line">
      <Trans
        t={t}
        i18nKey="governance.voting.about"
        components={{
          header: <SmallTitleText />,
          p: <FootnoteText className="text-text-secondary" as="div" />,
          ul: <ul className="list-disc ml-4" />,
          li: <li />,
        }}
      />
    </div>
  );
};

export const VoteDialog = ({ referendum, chain, onClose }: Props) => {
  const { t } = useI18n();

  const titleNode = (
    <HeaderTitleText className="flex items-center gap-1.5">
      <span>{t('governance.voting.title')}</span>
      <ChainIcon src={chain.icon} name={chain.name} />
      <span>{chain.name}</span>
    </HeaderTitleText>
  );

  return (
    <BaseModal
      isOpen
      closeButton
      title={titleNode}
      headerClass="px-5 py-3"
      panelClass="flex flex-col w-modal max-h-[738px]"
      contentClass="flex flex-col h-full min-h-0"
      onClose={onClose}
    >
      <div className="flex flex-col gap-6 grow min-h-0 py-4 overflow-y-auto shrink">
        <div className="flex px-5">
          <Popover offsetPx={5} horizontal="right" panelClass="w-90" content={<AboutVoting />}>
            <LabelHelpBox>{t('governance.voting.aboutLabel')}</LabelHelpBox>
          </Popover>
        </div>

        <div className="w-90">
          <AboutVoting />
        </div>
      </div>
      <div className="pt-3 pb-4 px-5 flex gap-4 shrink-0">
        <VoteButton icon="shelfDown" onClick={() => {}}>
          {t('governance.referendum.nay')}
        </VoteButton>
        <VoteButton icon="up" onClick={() => {}}>
          {t('governance.referendum.abstain')}
        </VoteButton>
        <VoteButton icon="up" onClick={() => {}}>
          {t('governance.referendum.aye')}
        </VoteButton>
      </div>
    </BaseModal>
  );
};
