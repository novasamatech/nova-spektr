import { PropsWithChildren } from 'react';

import cnTw from '@renderer/shared/utils/twMerge';
import { Icon } from '@renderer/components/ui';

type Props = {
  url: string;
  showIcon?: boolean;
};
const InfoLink = ({ url, showIcon = true, children }: PropsWithChildren<Props>) => (
  <a
    className={cnTw('w-max outline-offset-4', showIcon && 'flex items-center gap-x-1')}
    href={url}
    rel="noopener noreferrer"
    target="_blank"
  >
    {showIcon && <Icon className="text-neutral-variant" name="globe" size={16} />}
    <span className="pb-[1px] border-b border-primary text-primary text-xs font-semibold">{children}</span>
  </a>
);

export default InfoLink;
