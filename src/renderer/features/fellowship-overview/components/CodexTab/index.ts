/*

NOTE: Codex is a WORK IN PROGRESS feature and its not yet ready for production.

*/

export { CodexTab } from './CodexTab';
export { MarkdownRenderer } from './MarkdownRenderer';
export { TableOfContents } from './TableOfContents';
export { SearchWithDropdown } from './SearchWithDropdown';

export { useCodexSearch, useScroll, useTableOfContents } from './hooks';

export type { TextMatch } from './MarkdownRenderer';
export type { CodexTabProps } from './CodexTab';
export type { SearchWithDropdownProps } from './SearchWithDropdown';
export type { MiniSearchDocument, MiniSearchResult, SearchResult, Section } from './hooks/useCodexSearch';
export type { TableOfContentsItem } from './hooks/useTableOfContents';

export { highlightChildren, highlightText } from '../../utils/highlightUtils';
