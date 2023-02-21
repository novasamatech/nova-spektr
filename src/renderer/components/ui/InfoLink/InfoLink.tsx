import { PropsWithChildren } from 'react';

import { Icon } from '@renderer/components/ui';

type Props = {
  url: string;
};
const InfoLink = ({ url, children }: PropsWithChildren<Props>) => (
  <a className="flex items-center gap-x-1 w-max outline-offset-4" href={url} rel="noopener noreferrer" target="_blank">
    <Icon className="text-neutral-variant" name="globe" size={16} />
    <span className="pb-[1px] border-b border-primary text-primary text-xs font-semibold">{children}</span>
  </a>
);

export default InfoLink;
