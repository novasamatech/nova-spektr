import { PropsWithChildren, ReactNode } from 'react';
import { Menu } from '@headlessui/react';

import { cnTw } from '@shared/lib/utils';
import MenuPopover, { Props as MenuPopoverProps } from '../MenuPopover/MenuPopover';
import { FootnoteText } from '@shared/ui';

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

const InfoPopover = ({
  data,
  className,
  buttonClassName,
  containerClassName,
  children,
  ...popoverProps
}: PropsWithChildren<Props>) => {
  const popoverContent = data.map((section, index) => (
    <div key={index} className="pb-3 mb-3 border-b border-divider last:pb-0 last:mb-0 last:border-b-0">
      {section.title && (
        <FootnoteText className="text-text-tertiary pb-2 px-2" key={section.title}>
          {section.title}
        </FootnoteText>
      )}

      <ul className="flex flex-col">
        {section.items.map(({ value, id }) =>
          typeof value === 'string' ? (
            <li key={id}>
              <FootnoteText className="text-text-secondary px-2 break-words">{value}</FootnoteText>
            </li>
          ) : (
            <Menu.Item key={id} as="li">
              <div className="rounded-md text-shade-100 h-8 w-full">{value}</div>
            </Menu.Item>
          ),
        )}
      </ul>
    </div>
  ));

  return (
    <MenuPopover
      buttonClassName={cnTw('max-w-full', buttonClassName)}
      containerClassName={cnTw('max-w-full', containerClassName)}
      content={popoverContent}
      className={cnTw('min-w-[220px]', className)}
      {...popoverProps}
    >
      {children}
    </MenuPopover>
  );
};

export default InfoPopover;
