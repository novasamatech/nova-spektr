import { useState } from 'react';

import { Box, RankProgress } from '@/shared/ui-kit';
import { FootnoteText, TitleText } from '@/shared/ui/Typography';

import { RANKS_DATA } from '../mockups/ranks-data';

const RANKS = [
  { id: 'I', name: 'Humble', time: 'n/a', color: '#bbbbbb' },
  { id: 'II', name: 'Proficient', time: '~1 y', color: '#ffad4f' },
  { id: 'III', name: 'Fellow', time: '~2 y', color: '#ffa5a2' },
  { id: 'IV', name: 'Architect', time: '>3 y', color: '#d7abfe' },
  { id: 'V', name: 'Architect Adept', time: '>4 y', color: '#69d8ff' },
  { id: 'VI', name: 'Grand Architect', time: '>5 y', color: '#6de69f' },
  { id: 'VII', name: 'Free Master', time: '>6 y', color: '#B3B3FF' },
  { id: 'VIII', name: 'Master Constant', time: '>11 y', color: '#51EBDE' },
  { id: 'IX', name: 'Grand Master', time: '>19 y', color: '#FF98BC' },
];

type RankOverviewSectionProps = {
  onRankClick: (rankId: string) => void;
};

const RankOverviewSection = ({ onRankClick }: RankOverviewSectionProps) => {
  return (
    <Box gap={2}>
      {/* Title and description */}
      <Box gap={1}>
        <TitleText className="font-manrope text-[22px] leading-[28px] font-extrabold tracking-[-0.352px] text-text-primary">
          Current progress &amp; rank specifications
        </TitleText>
        <FootnoteText className="text-text-primary">
          From Humble to Master, each rank defines expectations, evaluation criteria, and growing influence on the
          protocol.
        </FootnoteText>
      </Box>

      {/* Rank Progress component */}
      <RankProgress ranks={RANKS} currentRankId="VI" title="From I Dan" onRankClick={onRankClick} />
    </Box>
  );
};

type RankCardProps = {
  rankId: string;
  isCurrentRank?: boolean;
};

const RankCard = ({ rankId, isCurrentRank = false }: RankCardProps) => {
  const rankData = RANKS_DATA[rankId];

  if (!rankData) return null;

  return (
    <div className="w-[444px] self-stretch rounded-lg bg-white">
      <Box gap={4} padding={4}>
        {/* Header with icon and title */}
        <Box direction="row" gap={4} horizontalAlign="flex-start" verticalAlign="center">
          {/* Icon placeholder - would need actual SVG from Figma */}
          <div className="h-16 w-16 shrink-0 rounded-lg bg-text-primary opacity-80" />

          <Box gap={1.5} grow={1}>
            <Box direction="row" gap={2} horizontalAlign="space-between" verticalAlign="center">
              <TitleText className="font-manrope text-header-title leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
                {rankData.title}
              </TitleText>
              {isCurrentRank && (
                <span className="font-inter text-footnote leading-[18px] font-medium tracking-[-0.12px] whitespace-pre text-text-positive">
                  You&apos;re here
                </span>
              )}
            </Box>

            <Box gap={0}>
              <FootnoteText className="text-text-primary">
                <span>Approx. academic analogue: </span>
                <span className="font-bold">{rankData.analogue}</span>
              </FootnoteText>
              <FootnoteText className="text-text-primary">
                <span>Material: </span>
                <span className="font-bold">{rankData.material}</span>
              </FootnoteText>
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Box gap={3}>
          <FootnoteText className="text-text-primary whitespace-pre-line">{rankData.description}</FootnoteText>
        </Box>
      </Box>
    </div>
  );
};

type RequirementsCardProps = {
  rankId: string;
};

const RequirementsCard = ({ rankId }: RequirementsCardProps) => {
  const rankData = RANKS_DATA[rankId];

  if (!rankData) return null;

  return (
    <div className="w-[444px] self-stretch rounded-lg bg-white">
      <Box gap={4} padding={4}>
        {/* Title */}
        <TitleText className="font-manrope text-header-title leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
          Requirements
        </TitleText>

        {/* Stats */}
        <Box direction="row" gap={6} horizontalAlign="flex-start" verticalAlign="center">
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-primary">Activity</FootnoteText>
            <TitleText className="font-manrope text-header-title leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
              {rankData.activity}
            </TitleText>
          </Box>
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-primary">Agreement</FootnoteText>
            <TitleText className="font-manrope text-header-title leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
              {rankData.agreement}
            </TitleText>
          </Box>
          <Box gap={1} grow={1}>
            <FootnoteText className="text-text-primary">From I Dan</FootnoteText>
            <TitleText className="font-manrope text-header-title leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
              {rankData.timeRequired}
            </TitleText>
          </Box>
        </Box>

        {/* Description */}
        <FootnoteText className="text-text-primary">
          Activity shows how much you participate in referenda.
          <br />
          Agreement reflects how closely your votes align with other members.
          <br />
          Details can be found in the <span className="text-[#4649f6]">Codex</span>.
        </FootnoteText>

        {/* Divider */}
        <div className="h-px w-full bg-filter-border" />

        {/* Requirements list */}
        <Box gap={2}>
          {rankData.requirements.map((requirement, index) => (
            <Box key={index} direction="row" gap={1.5} horizontalAlign="flex-start">
              <div className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-text-primary" />
              <FootnoteText className="flex-1 text-text-primary">{requirement}</FootnoteText>
            </Box>
          ))}
        </Box>
      </Box>
    </div>
  );
};

type RankDetailsProps = {
  selectedRankId: string;
};

const RankDetails = ({ selectedRankId }: RankDetailsProps) => {
  const isCurrentRank = selectedRankId === 'VI';

  return (
    <Box direction="row" gap={4} horizontalAlign="flex-start">
      <RankCard rankId={selectedRankId} isCurrentRank={isCurrentRank} />
      <RequirementsCard rankId={selectedRankId} />
    </Box>
  );
};

export const RanksTab = () => {
  const [selectedRankId, setSelectedRankId] = useState('VI');

  return (
    <div className="p-5">
      <Box gap={6}>
        <RankOverviewSection onRankClick={setSelectedRankId} />
        <RankDetails selectedRankId={selectedRankId} />
      </Box>
    </div>
  );
};

