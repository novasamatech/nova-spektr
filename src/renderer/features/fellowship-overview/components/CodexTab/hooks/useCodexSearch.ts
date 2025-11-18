import MiniSearch from 'minisearch';
import { useCallback, useMemo } from 'react';

export interface Section {
  id: string;
  title: string;
  content: string;
  type: 'main' | 'subcategory';
}

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  matchCount: number;
  snippet: string;
}

export interface MiniSearchDocument {
  id: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  type: 'main' | 'subcategory';
}

export interface MiniSearchResult {
  id: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  type: 'main' | 'subcategory';
  score: number;
  match: {
    [key: string]: string[];
  };
}

interface Match {
  sectionId: string;
  sectionTitle: string;
  matchText: string;
  position: number; // Position within the section
}

const parseMarkdownSections = (content: string): Section[] => {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let currentSection: { type: 'main' | 'subcategory'; title: string; content: string[]; id: string } | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentSection.content.join('\n').trim(),
        });
      }

      const title = trimmedLine.substring(2).trim();
      const id = titleToId(title);

      currentSection = {
        type: 'main',
        title,
        content: [],
        id,
      };
    } else if (trimmedLine.startsWith('## ')) {
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentSection.content.join('\n').trim(),
        });
      }

      const title = trimmedLine.substring(3).trim();
      const id = titleToId(title);

      currentSection = {
        type: 'subcategory',
        title,
        content: [],
        id,
      };
    } else if (currentSection) {
      currentSection.content.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      ...currentSection,
      content: currentSection.content.join('\n').trim(),
    });
  }

  return sections;
};

const titleToId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const escapeRegex = (query: string): string => {
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const useCodexSearch = (codexContent: string) => {
  const { miniSearchInstance, sections } = useMemo(() => {
    if (!codexContent) {
      return {
        miniSearchInstance: new MiniSearch({
          fields: ['sectionTitle', 'content'],
          storeFields: ['sectionId', 'sectionTitle', 'content', 'type'],
          searchOptions: {
            boost: { sectionTitle: 2 },
            fuzzy: 0.2,
            prefix: true,
          },
        }),
        sections: [],
      };
    }

    const miniSearch = new MiniSearch({
      fields: ['sectionTitle', 'content'],
      storeFields: ['sectionId', 'sectionTitle', 'content', 'type'],
      searchOptions: {
        boost: { sectionTitle: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    const parsedSections = parseMarkdownSections(codexContent);

    const documents = parsedSections.map(section => ({
      id: `${section.id}-${section.type}`,
      sectionId: section.id,
      sectionTitle: section.title,
      content: section.content,
      type: section.type,
    }));

    miniSearch.addAll(documents);

    return {
      miniSearchInstance: miniSearch,
      sections: parsedSections,
    };
  }, [codexContent]);

  const searchCodex = useCallback(
    (query: string): any[] => {
      if (!query.trim()) {
        return [];
      }
      return miniSearchInstance.search(query);
    },
    [miniSearchInstance],
  );

  const generateMatches = useCallback(
    (query: string): Match[] => {
      if (!query.trim()) {
        return [];
      }

      const miniSearchResults = searchCodex(query);
      const matches: Match[] = [];
      const escapedQuery = escapeRegex(query.toLowerCase());
      const matchRegex = new RegExp(`(${escapedQuery})`, 'gi');

      for (const result of miniSearchResults) {
        // Find matches in section title
        let match;
        matchRegex.lastIndex = 0;
        while ((match = matchRegex.exec(result.sectionTitle)) !== null) {
          matches.push({
            sectionId: result.sectionId,
            sectionTitle: result.sectionTitle,
            matchText: match[0],
            position: match.index,
          });
        }

        // Find matches in section content
        matchRegex.lastIndex = 0;
        while ((match = matchRegex.exec(result.content)) !== null) {
          matches.push({
            sectionId: result.sectionId,
            sectionTitle: result.sectionTitle,
            matchText: match[0],
            position: match.index,
          });
        }
      }

      return matches;
    },
    [searchCodex],
  );

  const generateSearchResults = useCallback(
    (query: string): SearchResult[] => {
      if (!query.trim()) {
        return [];
      }

      const miniSearchResults = searchCodex(query);
      const results: SearchResult[] = [];

      const sectionMap = new Map<string, any[]>();

      for (const result of miniSearchResults) {
        if (!sectionMap.has(result.sectionId)) {
          sectionMap.set(result.sectionId, []);
        }
        sectionMap.get(result.sectionId)!.push(result);
      }

      for (const [sectionId, sectionResults] of sectionMap) {
        const firstResult = sectionResults[0];
        const matchCount = sectionResults.length;

        const content = firstResult.content;
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();
        const queryIndex = contentLower.indexOf(queryLower);

        let snippet = content;
        if (queryIndex !== -1) {
          const snippetStart = Math.max(0, queryIndex - 100);
          const snippetEnd = Math.min(content.length, queryIndex + 200);
          snippet = content.slice(snippetStart, snippetEnd);

          snippet = snippet.replace(/^#{1,3}\s.*$/m, '').trim();
          if (snippetStart > 0) snippet = '...' + snippet;
          if (snippetEnd < content.length) snippet = snippet + '...';
        }

        // Simple highlighting without overlapping issues
        const escapedQuery = escapeRegex(query);
        const highlightRegex = new RegExp(`(${escapedQuery})`, 'gi');
        const highlightedSnippet = snippet.replace(highlightRegex, '<mark>$1</mark>');

        results.push({
          id: sectionId,
          title: firstResult.sectionTitle,
          content: firstResult.content,
          matchCount,
          snippet: highlightedSnippet,
        });
      }

      return results;
    },
    [searchCodex],
  );

  const filterSectionsByQuery = useCallback(
    (query: string, matches: Match[] = []): Section[] => {
      if (!query.trim()) {
        return sections;
      }

      if (matches.length > 0) {
        const matchingSectionIds = new Set(matches.map(match => match.sectionId));
        return sections.filter(section => matchingSectionIds.has(section.id));
      }

      const miniSearchResults = searchCodex(query);
      const matchingSectionIds = new Set(miniSearchResults.map(result => result.sectionId));
      return sections.filter(section => matchingSectionIds.has(section.id));
    },
    [sections, searchCodex],
  );

  return {
    generateMatches,
    generateSearchResults,
    filterSectionsByQuery,
    getAllSections: () => [...sections],
    getSectionById: (id: string) => sections.find(section => section.id === id),
    getRawContent: () => codexContent,
  };
};
