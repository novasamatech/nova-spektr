import { useUnit } from 'effector-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/shared/i18n';
import { Icon, IconButton } from '@/shared/ui';
import { Input, ScrollArea } from '@/shared/ui-kit';
import { codex } from '../../model/codex';

import { type SearchResult, useCodexSearch } from './hooks';

interface Match {
  sectionId: string;
  sectionTitle: string;
  matchText: string;
  position: number;
}

export interface SearchWithDropdownProps {
  placeholder?: string;
  onSearchResultClick?: (sectionId: string, query: string, allMatches: string[]) => void;
  onTextMatchClick?: (match: Match, allMatches: Match[]) => void;
  onClearSearch?: () => void;
  className?: string;
  showNavigation?: boolean;
  currentMatchIndex?: number;
  totalMatches?: number;
  onNavigateMatch?: (direction: 'prev' | 'next') => void;
}

const parseHighlightedText = (text: string): React.ReactNode[] => {
  const parts = text.split(/(<mark>.*?<\/mark>)/g);
  return parts.map((part, index) => {
    if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
      const content = part.slice(6, -7); // Remove <mark> and </mark>
      return (
        <mark
          key={`highlight-${content}-${Date.now()}-${index}`}
          className="rounded-sm bg-[rgba(70,73,246,0.5)] px-0.5 text-white"
        >
          {content}
        </mark>
      );
    }
    return part;
  });
};

export const SearchWithDropdown = ({
  placeholder,
  onSearchResultClick,
  onTextMatchClick,
  onClearSearch,
  className = '',
  showNavigation = false,
  currentMatchIndex = 0,
  totalMatches = 0,
  onNavigateMatch,
}: SearchWithDropdownProps) => {
  const { t } = useI18n();
  const codexContent = useUnit(codex.$codexContent);
  const { generateMatches, generateSearchResults } = useCodexSearch(codexContent);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    return generateMatches(searchQuery);
  }, [searchQuery, generateMatches]);

  const searchResults = useMemo(() => {
    return generateSearchResults(searchQuery);
  }, [searchQuery, generateSearchResults]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsDropdownOpen(value.trim().length > 0 && searchResults.length > 0);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsDropdownOpen(false);
    onClearSearch?.();
  };

  const handleResultClick = (result: SearchResult) => {
    if (onTextMatchClick && matches.length > 0) {
      const firstMatchInSection = matches.find((match: Match) => match.sectionId === result.id);
      if (firstMatchInSection) {
        onTextMatchClick(firstMatchInSection, matches);
      }
    } else {
      const allMatches = searchResults.map((r: SearchResult) => r.id);
      onSearchResultClick?.(result.id, searchQuery, allMatches);
    }

    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && containerRef.current && !containerRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setIsDropdownOpen(searchQuery.trim().length > 0 && searchResults.length > 0);
  }, [searchQuery, searchResults]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showNavigation || matches.length === 0) return;

      if (document.activeElement !== searchInputRef.current && !isDropdownOpen) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        if (event.key === 'ArrowDown') {
          onNavigateMatch?.('next');
          searchInputRef.current?.focus();
        } else if (event.key === 'ArrowUp') {
          onNavigateMatch?.('prev');
          searchInputRef.current?.focus();
        }
      }
    };

    if (showNavigation && matches.length > 0) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNavigation, matches.length, isDropdownOpen, onNavigateMatch]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Input
        ref={searchInputRef}
        value={searchQuery}
        placeholder={placeholder || t('fellowship.overview.searchPlaceholder')}
        height="sm"
        width="full"
        prefixElement={<Icon name="search" size={16} />}
        suffixElement={
          showNavigation && totalMatches > 0 ? (
            <div className="flex items-center gap-1">
              <IconButton
                name="arrowLeft"
                size={16}
                disabled={currentMatchIndex <= -1}
                onClick={() => onNavigateMatch?.('prev')}
              />
              <span className="px-1 text-[12px] text-text-secondary">
                {currentMatchIndex === -1 ? '0' : currentMatchIndex + 1}/{totalMatches}
              </span>
              <IconButton
                name="arrowRight"
                size={16}
                disabled={currentMatchIndex >= totalMatches - 1}
                onClick={() => onNavigateMatch?.('next')}
              />
              <div className="mx-1 h-4 w-px bg-text-tertiary" />
              <IconButton name="close" onClick={handleClearSearch} />
            </div>
          ) : searchQuery ? (
            <IconButton name="close" onClick={handleClearSearch} />
          ) : undefined
        }
        onChange={handleSearchChange}
      />

      {isDropdownOpen && searchResults.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1">
          <div className="rounded-lg border border-[rgba(69,69,137,0.06)] bg-white shadow-lg">
            <div className="border-b border-[rgba(69,69,137,0.06)] px-4 py-2">
              <div className="text-[12px] leading-[18px] font-medium tracking-[-0.12px] text-text-secondary">
                {searchResults.length} {t('fellowship.overview.matchingArticles')}
              </div>
            </div>

            <div style={{ height: 400 }}>
              <ScrollArea>
                <div>
                  {searchResults.map((result: SearchResult) => (
                    <div
                      key={result.id}
                      className="cursor-pointer border-b border-[rgba(69,69,137,0.06)] p-4 last:border-b-0 hover:bg-[rgba(69,69,137,0.06)]"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <div className="flex-1 text-[17px] leading-[22px] font-extrabold tracking-[-0.221px] text-text-primary">
                          {result.title}
                        </div>
                        <div className="text-[12px] leading-[18px] font-medium tracking-[-0.12px] text-text-secondary">
                          {result.matchCount}{' '}
                          {result.matchCount !== 1 ? t('fellowship.overview.matches') : t('fellowship.overview.match')}
                        </div>
                      </div>
                      <div className="text-[13px] leading-[20px] tracking-[-0.13px] text-text-primary">
                        {parseHighlightedText(result.snippet)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
