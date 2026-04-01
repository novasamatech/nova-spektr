import { type ReactElement, type ReactNode, Fragment, cloneElement, isValidElement } from 'react';

export function highlightText(text: string, query: string, isCurrentMatch: boolean = false): ReactNode[] {
  if (!query?.trim()) {
    return [text];
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let matchIndex = 0;

  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Add text before the match
    if (matchStart > lastIndex) {
      parts.push(text.slice(lastIndex, matchStart));
    }

    // Add the highlighted match
    const highlightClass = isCurrentMatch
      ? 'rounded-sm bg-[rgba(70,73,246,0.7)] px-0.5 text-white shadow-sm ring-1 ring-[rgba(70,73,246,0.5)]'
      : 'rounded-sm bg-[rgba(70,73,246,0.5)] px-0.5 text-white';

    parts.push(
      <span key={`highlight-${matchIndex}-${matchStart}`} className={highlightClass} data-match-index={matchIndex}>
        {match[0]}
      </span>,
    );

    lastIndex = matchEnd;
    matchIndex++;

    // Prevent infinite loop
    if (regex.lastIndex === matchStart) {
      regex.lastIndex++;
    }
  }

  // Add remaining text after the last match
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function highlightChildren(children: ReactNode, query: string, currentMatchIndex: number = -1): ReactNode {
  if (typeof children === 'string') {
    return highlightText(children, query, false);
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <Fragment key={`child-${index}`}>{highlightChildren(child, query, currentMatchIndex)}</Fragment>
    ));
  }

  if (isValidElement(children)) {
    if (
      children.type === 'span' &&
      children.props &&
      typeof children.props === 'object' &&
      'data-match-index' in children.props
    ) {
      return children;
    }

    const props = children.props as { children?: ReactNode; [key: string]: unknown };
    return cloneElement(children, {
      ...props,
      children: highlightChildren(props.children, query, currentMatchIndex),
    } as unknown as ReactElement);
  }

  return children;
}
