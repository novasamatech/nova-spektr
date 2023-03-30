import { Menu } from '@headlessui/react';
import cn from 'classnames';
import React, { PropsWithChildren } from 'react';

import CalloutText from '@renderer/components/ui-redesign/Typography/components/CalloutText';
import TextBase from '@renderer/components/ui-redesign/Typography/common/TextBase';

type Props = {
  data: InfoSection[];
  className?: string;
  offsetPx?: number;
};

export interface InfoSection {
  title: string;
  items: (string | React.ReactElement)[];
}

const InfoPopover = ({ data, className, children, offsetPx = 7 }: PropsWithChildren<Props>) => {
  return (
    <Menu>
      {({ open }) => (
        <div className={cn('relative', open && 'z-10')}>
          <Menu.Button>{children}</Menu.Button>
          <Menu.Items
            style={{ marginTop: offsetPx + 'px' }}
            className={cn(
              'bg-white z-10 absolute left-0 top-[100%] rounded-md',
              'shadow-popover w-max p-3 min-w-[220px]',
              className,
            )}
          >
            {data.map((section, i) => (
              <div key={i}>
                <TextBase className="text-3xs text-redesign-shade-48 uppercase pb-2" key={section.title}>
                  {section.title}
                </TextBase>

                <CalloutText key={i} className="text-3xs pb-4 flex flex-col last:p-0">
                  {section.items.map((item, i) =>
                    typeof item === 'string' ? (
                      item
                    ) : (
                      <Menu.Item
                        key={i}
                        // typescript says there's no classname but that's a lie. Need to check out Menu.Item code
                        // @ts-ignore
                        className="rounded-xs text-shade-100 ui-active:bg-redesign-primary ui-active:text-white h-8 w-full"
                      >
                        {item}
                      </Menu.Item>
                    ),
                  )}
                </CalloutText>
                {i !== data.length - 1 && <hr className="border-redesign-shade-12 pb-3" />}
              </div>
            ))}
          </Menu.Items>
        </div>
      )}
    </Menu>
  );
};

export default InfoPopover;
