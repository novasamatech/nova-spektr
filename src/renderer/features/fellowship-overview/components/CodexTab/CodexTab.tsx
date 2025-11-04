/* eslint-disable i18next/no-literal-string */

/*

NOTE: Codex is a WORK IN PROGRESS feature and its not yet ready for production.

*/

import { useEffect, useState } from 'react';

import { Loader } from '@/shared/ui';
import { BodyText } from '@/shared/ui/Typography';
import { ScrollArea } from '@/shared/ui-kit';
import { useCodex } from '@/domains/collectives';
import { useFellowshipChain } from '@/aggregates/fellowship-network';

import { MarkdownRenderer } from './MarkdownRenderer';
import { SearchWithDropdown } from './SearchWithDropdown';
import { TableOfContents } from './TableOfContents';
import { type Section, useCodexSearch, useScroll, useTableOfContents } from './hooks';

interface Match {
  sectionId: string;
  sectionTitle: string;
  matchText: string;
  position: number;
}

export interface CodexTabProps {
  searchQuery: string;
  onClearSearch: () => void;
  currentMatchIndex?: number;
  textMatches?: Match[];
}

export const CodexTab = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const chain = useFellowshipChain();
  const { data: codexContent, pending } = useCodex({ palletType: 'fellowship', chainId: chain?.chainId });

  const { generateMatches, filterSectionsByQuery, getRawContent } = useCodexSearch(codexContent ?? '');
  const { scrollToSection, scrollToMatch } = useScroll();
  const { getFirstTableOfContentsItem, getTableOfContents } = useTableOfContents(getRawContent());

  const [activeSection, setActiveSection] = useState(getFirstTableOfContentsItem()?.id || 'background');

  const sections = filterSectionsByQuery(searchQuery, matches);
  const hasSearchResults = searchQuery.trim() && (matches.length > 0 || sections.length > 0);

  const visibleSectionIds = new Set(sections.map((section: Section) => section.id));
  const tableOfContentsItems = getTableOfContents().filter(item => {
    if (visibleSectionIds.has(item.id)) {
      return true;
    }
    if (item.children) {
      const hasVisibleChildren = item.children.some(child => visibleSectionIds.has(child.id));
      return hasVisibleChildren;
    }
    return false;
  });

  const handleSectionClick = (sectionId: string) => {
    const sectionExists = sections.some((section: Section) => section.id === sectionId);
    if (!sectionExists) {
      console.warn(`Section ${sectionId} is not currently visible (filtered out by search)`);
      return;
    }

    setActiveSection(sectionId);
    scrollToSection(sectionId);
  };

  const handleCodexSearchResultClick = (sectionId: string, query: string, allMatches: string[]) => {
    setSearchQuery(query);
    const convertedMatches: Match[] = allMatches.map((sectionId, index) => ({
      sectionId,
      sectionTitle: sectionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      matchText: query,
      position: index * 1000,
    }));
    setMatches(convertedMatches);
    setCurrentMatchIndex(allMatches.indexOf(sectionId));
  };

  const handleTextMatchClick = (match: Match, allMatches: Match[]) => {
    setSearchQuery(match.matchText);
    setMatches(allMatches);
    setCurrentMatchIndex(allMatches.indexOf(match));
  };

  const handleNavigateMatch = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    } else if (direction === 'next' && currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else if (direction === 'next' && currentMatchIndex === -1 && matches.length > 0) {
      setCurrentMatchIndex(0);
    } else if (direction === 'prev' && currentMatchIndex === 0) {
      setCurrentMatchIndex(-1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setMatches([]);
    setCurrentMatchIndex(-1);
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      const newMatches = generateMatches(searchQuery);
      setMatches(newMatches);
      setCurrentMatchIndex(-1);
    } else {
      setMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery, generateMatches]);

  useEffect(() => {
    const currentActiveSectionExists = sections.some((section: Section) => section.id === activeSection);
    if (!currentActiveSectionExists && sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  useEffect(() => {
    if (matches.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < matches.length) {
      const currentMatch = matches[currentMatchIndex];
      setActiveSection(currentMatch.sectionId);
      scrollToMatch(currentMatch.sectionId, currentMatchIndex);
    }
  }, [currentMatchIndex, matches, scrollToMatch]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-3">
        <div className="flex-1" />
        <div className="w-[645px]">
          <SearchWithDropdown
            placeholder="Search across Fellowship Codex"
            showNavigation={matches.length > 0}
            currentMatchIndex={currentMatchIndex}
            totalMatches={matches.length}
            onSearchResultClick={handleCodexSearchResultClick}
            onTextMatchClick={handleTextMatchClick}
            onNavigateMatch={handleNavigateMatch}
            onClearSearch={handleClearSearch}
          />
        </div>
      </div>
      <div className="relative min-h-0 flex-1 rounded-[12px]">
        <style>
          {`
            mark {
              background-color: rgba(70, 73, 246, 0.5);
              color: white;
              padding: 0.125rem;
              border-radius: 0.125rem;
            }
          `}
        </style>

        <div className="flex h-full">
          <div className="w-[240px] flex-shrink-0 p-5">
            <TableOfContents
              items={tableOfContentsItems}
              activeSection={activeSection}
              onSectionChange={handleSectionClick}
            />
          </div>

          <div className="w-5 flex-shrink-0" />

          <div className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea>
              <div className="space-y-8 p-5">
                {!hasSearchResults && searchQuery.trim() ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BodyText className="mb-2 text-text-secondary">
                      No results found for &quot;{searchQuery}&quot;
                    </BodyText>
                    <BodyText className="text-text-tertiary">
                      Try searching for different keywords or{' '}
                      <button type="button" className="text-action-text hover:underline" onClick={handleClearSearch}>
                        clear search
                      </button>
                    </BodyText>
                  </div>
                ) : pending ? (
                  <Loader color="primary" size={24} />
                ) : (
                  <div className="text-text-primary">
                    <MarkdownRenderer
                      sections={sections}
                      searchQuery={searchQuery}
                      currentMatchIndex={currentMatchIndex}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};
