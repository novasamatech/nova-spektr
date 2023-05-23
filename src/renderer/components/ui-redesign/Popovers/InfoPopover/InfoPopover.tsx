import { Menu } from '@headlessui/react';
import React, { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import MenuPopover, { Props as MenuPopoverProps } from '../MenuPopover/MenuPopover';
import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  data: InfoSection[];
} & Omit<MenuPopoverProps, 'content'>;

type MenuItem = {
  id: string;
  value: string | React.ReactElement;
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

      <FootnoteText key={index} className="text-text-secondary pb-4 flex flex-col last:p-0">
        {section.items.map(({ value, id }) =>
          typeof value === 'string' ? (
            value
          ) : (
            <Menu.Item key={id}>
              {/* // TODO check out why headless ui menu item type dont support className */}
              <div className="rounded-xs text-shade-100 ui-active:bg-primary ui-active:text-white h-8 w-full">
                {value}
              </div>
            </Menu.Item>
          ),
        )}
      </FootnoteText>
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
