import { useMemo } from 'react';

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
  isExpanded?: boolean;
  children?: TableOfContentsItem[];
}

const titleToId = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

const parseMarkdownToTableOfContents = (markdownContent: string): TableOfContentsItem[] => {
  const lines = markdownContent.split('\n');
  const toc: TableOfContentsItem[] = [];
  const stack: TableOfContentsItem[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('# ') && !trimmedLine.startsWith('## ')) {
      const title = trimmedLine.substring(2).trim();
      const id = titleToId(title);

      const category: TableOfContentsItem = {
        id,
        title,
        level: 0,
        isExpanded: false,
        children: [],
      };

      toc.push(category);
      stack.length = 0;
      stack.push(category);
    } else if (trimmedLine.startsWith('## ')) {
      const title = trimmedLine.substring(3).trim();
      const id = titleToId(title);

      const subcategory: TableOfContentsItem = {
        id,
        title,
        level: 1,
      };

      if (stack.length > 0) {
        const currentCategory = stack[stack.length - 1];
        if (currentCategory.children) {
          currentCategory.children.push(subcategory);
        }
      }
    }
  }

  if (toc.length > 0) {
    toc[0]!.isExpanded = true;
  }

  return toc;
};

export const useTableOfContents = (markdownContent: string = '') => {
  const tocItems = useMemo(() => {
    return parseMarkdownToTableOfContents(markdownContent);
  }, [markdownContent]);

  const getTableOfContents = (): TableOfContentsItem[] => {
    return [...tocItems];
  };

  const getTableOfContentsItemById = (id: string): TableOfContentsItem | undefined => {
    const findItem = (items: TableOfContentsItem[]): TableOfContentsItem | undefined => {
      for (const item of items) {
        if (item.id === id) {
          return item;
        }
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    return findItem(tocItems);
  };

  const getFirstTableOfContentsItem = (): TableOfContentsItem | undefined => {
    return tocItems[0];
  };

  return {
    getTableOfContents,
    getTableOfContentsItemById,
    getFirstTableOfContentsItem,
  };
};
