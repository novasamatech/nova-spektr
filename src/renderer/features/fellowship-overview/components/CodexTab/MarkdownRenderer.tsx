import React from 'react';
import ReactMarkdown from 'react-markdown';

import { Surface } from '@/shared/ui-kit';
import { highlightChildren } from '../../utils/highlightUtils';

import { type Section } from './hooks';

export interface TextMatch {
  sectionId: string;
  sectionTitle: string;
  matchIndex: number;
  textBefore: string;
  matchedText: string;
  textAfter: string;
  position: number;
}

interface MarkdownRendererProps {
  sections: Section[];
  searchQuery: string;
  currentMatchIndex: number;
}

const SectionRenderer = ({
  section,
  searchQuery,
  currentMatchIndex,
}: {
  section: Section;
  searchQuery: string;
  currentMatchIndex: number;
}) => {
  if (section.type === 'main') {
    return (
      <div id={section.id} className="space-y-8">
        <div>
          <h1 className="mb-2 scroll-mt-20 text-[22px] leading-[28px] font-extrabold tracking-[-0.352px]">
            {highlightChildren(section.title, searchQuery, currentMatchIndex)}
          </h1>
          <ReactMarkdown>{section.content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <Surface id={section.id} className="mb-4 rounded-lg p-4">
      <div className="space-y-4">
        <h2 className="scroll-mt-20 text-[17px] leading-[22px] font-extrabold tracking-[-0.221px]">
          {highlightChildren(section.title, searchQuery, currentMatchIndex)}
        </h2>
        <ReactMarkdown>{section.content}</ReactMarkdown>
      </div>
    </Surface>
  );
};

export const MarkdownRenderer = ({ sections, searchQuery, currentMatchIndex }: MarkdownRendererProps) => {
  return (
    <div className="space-y-8">
      {sections.map(section => (
        <SectionRenderer
          key={section.id}
          section={section}
          searchQuery={searchQuery}
          currentMatchIndex={currentMatchIndex}
        />
      ))}
    </div>
  );
};
