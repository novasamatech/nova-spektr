import { useGate, useUnit } from 'effector-react';
import { type PropsWithChildren, useDeferredValue, useMemo, useState } from 'react';

import { useI18n } from '@/app/providers';
import { nonNullable, performSearch, toAddress } from '@/shared/lib/utils';
import { FootnoteText, SearchInput } from '@/shared/ui';
import { Box, Modal } from '@/shared/ui-kit';
import { identityModel } from '../model/identity';
import { membersModel } from '../model/members';
import { membersFeatureStatus } from '../model/status';

import { Member } from './Member';
import { MembersListEmptyState } from './MembersListEmptyState';

export const MembersModal = ({ children }: PropsWithChildren) => {
  useGate(membersFeatureStatus.gate);

  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const members = useUnit(membersModel.$list);
  const identities = useUnit(identityModel.$identity);
  const input = useUnit(membersFeatureStatus.input);

  const chain = input?.chain ?? null;

  const filteredMembers = useMemo(() => {
    return performSearch({
      query: deferredQuery,
      records: members,
      getMeta: member => ({
        address: toAddress(member.accountId, { prefix: chain?.addressPrefix }),
        name: identities[member.accountId]?.name ?? '',
      }),
      weights: {
        name: 1,
        address: 0.5,
      },
    });
  }, [members, chain, deferredQuery]);

  return (
    <Modal size="md" height="full">
      <Modal.Trigger>{children}</Modal.Trigger>
      <Modal.Title close>{t('fellowship.members.modalTitle')}</Modal.Title>
      <Modal.Content>
        <Box padding={[4, 5]} gap={6} fillContainer>
          {members.length !== 0 ? (
            <SearchInput autoFocus placeholder={t('general.input.searchLabel')} value={query} onChange={setQuery} />
          ) : null}

          {filteredMembers.length === 0 ? (
            <MembersListEmptyState />
          ) : (
            <Box gap={2}>
              <FootnoteText className="px-2 text-text-tertiary">
                {t('fellowship.members.modalAccountTitle')}
              </FootnoteText>

              {nonNullable(chain) &&
                filteredMembers.map(item => <Member key={item.accountId} item={item} chain={chain} />)}
            </Box>
          )}
        </Box>
      </Modal.Content>
    </Modal>
  );
};
