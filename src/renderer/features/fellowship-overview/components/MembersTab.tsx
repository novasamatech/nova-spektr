/* eslint-disable i18next/no-literal-string */
import { useUnit } from 'effector-react';
import { useState } from 'react';

import { Box, SearchInput, Select } from '@/shared/ui-kit';
import { FootnoteText, TitleText } from '@/shared/ui/Typography';
import { fellowshipMember } from '@/aggregates/fellowship-member';

const RANKS = [
  { id: 'I', name: 'Humble' },
  { id: 'II', name: 'Proficient' },
  { id: 'III', name: 'Fellow' },
  { id: 'IV', name: 'Architect' },
  { id: 'V', name: 'Architect Adept' },
  { id: 'VI', name: 'Grand Architect' },
  { id: 'VII', name: 'Free Master' },
  { id: 'VIII', name: 'Master Constant' },
  { id: 'IX', name: 'Grand Master' },
];

type MemberStatus = 'Active' | 'Passive';

const StatusIndicator = ({ status }: { status: MemberStatus }) => {
  const isActive = status === 'Active';

  return (
    <div className="flex h-[22px] flex-row items-center gap-1">
      <div className="relative size-5 shrink-0">
        {/* Status dot with glow effect */}
        <div
          className={`absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${isActive ? 'bg-text-positive' : 'bg-text-secondary'}`}
        />
        {isActive && (
          <>
            <div className="absolute top-1/2 left-1/2 size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-positive opacity-30" />
            <div className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-text-positive opacity-10" />
          </>
        )}
      </div>
      <FootnoteText className="leading-[20px] whitespace-pre text-text-primary">{status}</FootnoteText>
    </div>
  );
};

const RankBadge = ({ rank }: { rank: string }) => {
  return (
    <div className="bg-badge-background-default/10 flex h-5 w-[26px] shrink-0 items-center justify-center rounded px-1 py-0.5">
      <span className="font-inter text-[10px] leading-[12px] font-semibold tracking-[0.75px] text-text-primary uppercase">
        {rank}
      </span>
    </div>
  );
};

type MembersTableProps = {
  members: {
    accountId: string;
    rank: number;
    isActive?: boolean;
  }[];
};

const MembersTable = ({ members }: MembersTableProps) => {
  const currentMember = useUnit(fellowshipMember.$currentMember);

  // Helper to get rank label
  const getRankLabel = (rank: number) => {
    const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
    return romanNumerals[rank] || `${rank}`;
  };

  // Mock data for salary, proposals, voted - replace with real data when available
  const getMockStats = () => ({
    salary: '13.33K',
    proposals: Math.floor(Math.random() * 60),
    voted: Math.floor(Math.random() * 150),
  });

  return (
    <div className="w-full">
      {/* Table Header */}
      <div className="flex h-[30px] items-end border-b border-filter-border px-2">
        <div className="flex w-[67px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Rank ↑</FootnoteText>
        </div>
        <div className="flex w-[452px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Account</FootnoteText>
        </div>
        <div className="flex w-[80px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Status</FootnoteText>
        </div>
        <div className="flex w-[120px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Salary (USDT)</FootnoteText>
        </div>
        <div className="flex w-[96px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Proposals</FootnoteText>
        </div>
        <div className="flex w-[74px] items-center px-3 pb-3">
          <FootnoteText className="text-text-secondary">Voted</FootnoteText>
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-filter-border">
        {members.map(member => {
          const isCurrentUser = currentMember?.accountId === member.accountId;
          const stats = getMockStats();
          const status = member.isActive !== false ? 'Active' : 'Passive';

          return (
            <div
              key={member.accountId}
              className="flex h-14 items-center bg-white px-2 hover:bg-block-background-default/50"
            >
              {/* Rank */}
              <div className="flex w-[67px] items-center justify-start px-3">
                <RankBadge rank={getRankLabel(member.rank)} />
              </div>

              {/* Account */}
              <div className="flex w-[452px] items-center gap-2 px-3">
                <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-icon-default/20">
                  {/* Identicon placeholder - integrate with actual Identicon component */}
                  <div className="bg-badge-background-default/40 size-3 rounded-full" />
                </div>
                <FootnoteText className="truncate text-text-secondary">
                  {member.accountId.slice(0, 8)}...{member.accountId.slice(-8)}
                </FootnoteText>
                {isCurrentUser && (
                  <span className="font-inter text-footnote leading-[18px] font-medium tracking-[-0.12px] text-text-positive">
                    You
                  </span>
                )}
              </div>

              {/* Status */}
              <div className="flex w-[80px] items-center px-3">
                <StatusIndicator status={status} />
              </div>

              {/* Salary */}
              <div className="flex w-[120px] items-center justify-end px-3">
                <FootnoteText className="text-text-primary">{stats.salary}</FootnoteText>
              </div>

              {/* Proposals */}
              <div className="flex w-[96px] items-center justify-end px-3">
                <FootnoteText className="text-text-primary">{stats.proposals}</FootnoteText>
              </div>

              {/* Voted */}
              <div className="flex w-[74px] items-center justify-end px-3">
                <FootnoteText className="text-text-primary">{stats.voted}</FootnoteText>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MembersFilters = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRank, setSelectedRank] = useState<string>('all');

  return (
    <div className="flex flex-row items-start gap-2.5">
      <div className="h-[34px] w-[462px]">
        <SearchInput placeholder="Search by address or identity" value={searchQuery} onChange={setSearchQuery} />
      </div>
      <div className="h-[34px] w-[174px]">
        <Select placeholder="Rank" value={selectedRank} onChange={value => setSelectedRank(value)}>
          <Select.Item id="all" value="all">
            All Ranks
          </Select.Item>
          {RANKS.map(rank => (
            <Select.Item key={rank.id} id={rank.id} value={rank.id}>
              Rank {rank.id}
            </Select.Item>
          ))}
        </Select>
      </div>
    </div>
  );
};

export const MembersTab = () => {
  const members = useUnit(fellowshipMember.$chainMembers);
  // TODO: integrate search and rank filtering

  return (
    <div className="p-5">
      <Box gap={6}>
        {/* Title and description */}
        <Box gap={1}>
          <TitleText className="font-manrope text-[22px] leading-[28px] font-extrabold tracking-[-0.352px] text-text-primary">
            Members
          </TitleText>
          <FootnoteText className="text-text-primary">
            A complete list of all members, allowing easy tracking of their progression and involvement.
          </FootnoteText>
        </Box>

        {/* Members table */}
        <MembersTable members={members} />
      </Box>
    </div>
  );
};

