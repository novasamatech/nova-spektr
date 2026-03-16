/* eslint-disable i18next/no-literal-string */

/*

NOTE: Codex is a WORK IN PROGRESS feature and its not yet ready for production.

*/

import React from 'react';

import { BodyText, SmallTitleText } from '@/shared/ui/Typography';
import { Accordion, ScrollArea } from '@/shared/ui-kit';

import { type TableOfContentsItem } from './hooks';

interface TableOfContentsItemComponentProps {
  item: TableOfContentsItem;
  isActive: boolean;
  activeSection: string;
  onClick: (id: string) => void;
}

const TableOfContentsItemComponent = ({
  item,
  isActive,
  activeSection,
  onClick,
}: TableOfContentsItemComponentProps) => {
  const hasChildren = item.children && item.children.length > 0;

  if (!hasChildren) {
    return (
      <div className={`cursor-pointer py-1 ${item.level === 0 ? 'pl-0' : 'pl-5'}`} onClick={() => onClick(item.id)}>
        <BodyText
          className={`text-[13px] leading-[20px] font-medium tracking-[-0.13px] normal-case ${
            isActive ? 'text-action-text' : 'text-text-primary'
          }`}
        >
          {item.title}
        </BodyText>
      </div>
    );
  }

  return (
    <Accordion initialOpen={item.isExpanded}>
      <Accordion.Trigger>
        <BodyText
          className={`truncate text-[13px] leading-[20px] font-medium tracking-[-0.13px] normal-case ${
            isActive ? 'text-action-text' : 'text-text-primary'
          }`}
        >
          {item.title}
        </BodyText>
      </Accordion.Trigger>
      <Accordion.Content>
        <div className="space-y-1 pl-0">
          {item.children?.map(child => (
            <TableOfContentsItemComponent
              key={child.id}
              item={child}
              isActive={child.id === activeSection}
              activeSection={activeSection}
              onClick={onClick}
            />
          ))}
        </div>
      </Accordion.Content>
    </Accordion>
  );
};

interface TableOfContentsProps {
  items: TableOfContentsItem[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

export const TableOfContents = ({ items, activeSection, onSectionChange }: TableOfContentsProps) => {
  return (
    <div className="w-[240px] rounded-lg bg-card-background p-3">
      <div className="mb-3">
        <SmallTitleText className="text-[14px] leading-[18px] font-extrabold tracking-[-0.182px] text-text-primary">
          Table of contents
        </SmallTitleText>
      </div>
      <div className="h-[400px]">
        <ScrollArea>
          <div className="space-y-2 pr-2">
            {items.map(item => (
              <TableOfContentsItemComponent
                key={item.id}
                item={item}
                isActive={activeSection === item.id}
                activeSection={activeSection}
                onClick={onSectionChange}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
