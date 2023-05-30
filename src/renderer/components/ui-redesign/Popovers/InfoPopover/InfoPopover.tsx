import { PropsWithChildren, ReactNode } from 'react';
import { Menu } from '@headlessui/react';

import cnTw from '@renderer/shared/utils/twMerge';
import MenuPopover, { Props as MenuPopoverProps } from '../MenuPopover/MenuPopover';
import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  data: InfoSection[];
} & Omit<MenuPopoverProps, 'content'>;

type MenuItem = {
  id: string;
  value: string | ReactNode;
};

export type InfoSection = {
  title?: string;
  items: MenuItem[];
};

const InfoPopover = ({ data, className, children, ...popoverProps }: PropsWithChildren<Props>) => {
  const popoverContent = data.map((section, index) => (
    <div key={index}>
      {section.title && (
        <FootnoteText className="text-text-tertiary uppercase pb-2" key={section.title}>
          {section.title}
        </FootnoteText>
      )}

      <ul className="flex flex-col mb-4 last:mb-0">
        {section.items.map(({ value, id }) =>
          typeof value === 'string' ? (
            <li key={id}>
              <FootnoteText className="text-text-secondary">{value}</FootnoteText>
            </li>
          ) : (
            <Menu.Item key={id} as="li">
              {/* // TODO check out why headless ui menu item type dont support className */}
              <div className="rounded-md text-shade-100 ui-active:bg-action-background-hover h-8 w-full">{value}</div>
            </Menu.Item>
          ),
        )}
      </ul>
      {index !== data.length - 1 && <hr className="border-divider pb-3" />}
    </div>
  ));

  return (
    <MenuPopover content={popoverContent} className={cnTw('min-w-[220px]', className)} {...popoverProps}>
      {children}
    </MenuPopover>
  );
};

export default InfoPopover;
