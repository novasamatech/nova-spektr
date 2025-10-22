/* eslint-disable i18next/no-literal-string */

/*

NOTE: Codex is a WORK IN PROGRESS feature and its not yet ready for production.

*/

import { useUnit } from 'effector-react';
import { useEffect, useState } from 'react';

import { BodyText } from '@/shared/ui/Typography';
import { ScrollArea } from '@/shared/ui-kit';
import { codex } from '../../model/codex';

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

  const codexContent = useUnit(codex.$codexContent);

  useEffect(() => {
    codex.requestCodex({});
  }, []);

  const { generateMatches, filterSectionsByQuery, getRawContent } = useCodexSearch(codexContent);
  const { scrollToSection, scrollToMatch } = useScroll();
  const { getFirstTableOfContentsItem, getTableOfContents } = useTableOfContents(getRawContent());

  const [activeSection, setActiveSection] = useState(getFirstTableOfContentsItem()?.id || 'background');

  const sections = filterSectionsByQuery(searchQuery, matches);
  const hasSearchResults = searchQuery.trim() && (matches.length > 0 || sections.length > 0);

  // Filter table of contents to only show sections that are currently visible
  const visibleSectionIds = new Set(sections.map((section: Section) => section.id));
  const tableOfContentsItems = getTableOfContents().filter(item => {
    if (visibleSectionIds.has(item.id)) {
      return true;
    }
    // Also include items that have visible children
    if (item.children) {
      const hasVisibleChildren = item.children.some(child => visibleSectionIds.has(child.id));
      return hasVisibleChildren;
    }
    return false;
  });

  const handleSectionClick = (sectionId: string) => {
    // Check if the section exists in the current filtered sections
    const sectionExists = sections.some((section: Section) => section.id === sectionId);
    if (!sectionExists) {
      console.warn(`Section ${sectionId} is not currently visible (filtered out by search)`);
      return;
    }

    setActiveSection(sectionId);
    scrollToSection(sectionId);
  };

  // Handle search result click
  const handleCodexSearchResultClick = (sectionId: string, query: string, allMatches: string[]) => {
    setSearchQuery(query);
    // Convert section matches to matches
    const convertedMatches: Match[] = allMatches.map((sectionId, index) => ({
      sectionId,
      sectionTitle: sectionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      matchText: query,
      position: index * 1000, // Approximate position
    }));
    setMatches(convertedMatches);
    setCurrentMatchIndex(allMatches.indexOf(sectionId));
  };

  // Handle individual text match click
  const handleTextMatchClick = (match: Match, allMatches: Match[]) => {
    setSearchQuery(match.matchText);
    setMatches(allMatches);
    setCurrentMatchIndex(allMatches.indexOf(match));
  };

  // Handle navigation between matches
  const handleNavigateMatch = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentMatchIndex > 0) {
      setCurrentMatchIndex(currentMatchIndex - 1);
    } else if (direction === 'next' && currentMatchIndex < matches.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else if (direction === 'next' && currentMatchIndex === -1 && matches.length > 0) {
      // If we're at the initial state (-1) and going next, go to first match
      setCurrentMatchIndex(0);
    } else if (direction === 'prev' && currentMatchIndex === 0) {
      // If we're at first match and going prev, go back to initial state
      setCurrentMatchIndex(-1);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    setMatches([]);
    setCurrentMatchIndex(-1);
  };

  // Update matches when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const newMatches = generateMatches(searchQuery);
      setMatches(newMatches);
      setCurrentMatchIndex(-1); // Reset to initial state
    } else {
      setMatches([]);
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery, generateMatches]);

  // Update active section when sections change to ensure it's valid
  useEffect(() => {
    const currentActiveSectionExists = sections.some((section: Section) => section.id === activeSection);
    if (!currentActiveSectionExists && sections.length > 0) {
      // If current active section is not visible, set to first visible section
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  // Handle navigation and scrolling
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
