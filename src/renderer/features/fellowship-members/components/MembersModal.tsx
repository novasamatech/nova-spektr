import { useUnit } from 'effector-react';
import { type PropsWithChildren, useState } from 'react';

import { useI18n } from '@/app/providers';
import { nonNullable } from '@/shared/lib/utils';
import { FootnoteText, SearchInput } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { membersModel } from '../model/members';
import { membersFeatureStatus } from '../model/status';

import { Member } from './Member';
import { MembersListEmptyState } from './MembersListEmptyState';

export const MembersModal = ({ children }: PropsWithChildren) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const members = useUnit(membersModel.$list);
  const input = useUnit(membersFeatureStatus.input);

  return (
    <Modal size="md">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.members.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={6}>
          {members.length !== 0 ? (
            <SearchInput placeholder={t('general.input.searchLabel')} value={query} onChange={setQuery} />
          ) : null}

          {members.length === 0 ? (
            <MembersListEmptyState />
          ) : (
            <Box gap={2}>
              <FootnoteText className="px-2 text-text-tertiary">
                {t('fellowship.members.modalAccountTitle')}
              </FootnoteText>

              {nonNullable(input) &&
                members.map(item => <Member key={item.accountId} item={item} chain={input.chain} />)}
            </Box>
          )}
        </Box>
      </Modal.Content>
    </Modal>
  );
};
