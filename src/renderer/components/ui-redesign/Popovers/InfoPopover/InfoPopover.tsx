import { Menu } from '@headlessui/react';
import cn from 'classnames';
import React, { PropsWithChildren } from 'react';

import { FootnoteText } from '@renderer/components/ui-redesign';

type Props = {
  data: InfoSection[];
  className?: string;
  buttonClassName?: string;
  offsetPx?: number;
};

type MenuItem = {
  id: string;
  value: string | React.ReactElement;
};

export type InfoSection = {
  title?: string;
  items: MenuItem[];
};

const InfoPopover = ({ data, className, buttonClassName, children, offsetPx = 7 }: PropsWithChildren<Props>) => {
  return (
    <Menu>
      {({ open }) => (
        <div className={cn('relative', open && 'z-10')}>
          <Menu.Button className={cn('flex items-center', buttonClassName)} onClick={(e) => e.stopPropagation()}>
            {children}
          </Menu.Button>
          <Menu.Items
            style={{ marginTop: offsetPx + 'px' }}
            className={cn(
              'bg-white z-10 absolute left-0 top-[100%] rounded-md',
              'shadow-popover w-max p-3 min-w-[220px]', // TODO change shadow, text and bg color
              className,
            )}
          >
            {data.map((section, index) => (
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
            ))}
          </Menu.Items>
        </div>
      )}
    </Menu>
  );
};

export default InfoPopover;
