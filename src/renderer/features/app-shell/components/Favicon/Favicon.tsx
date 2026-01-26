import { useUnit } from 'effector-react';
import { useEffect } from 'react';

import faviconBadge from '@/app/favicon-badge.png';
import favicon from '@/app/favicon.png';

import { faviconModel } from '../../model/favicon-model';

export const Favicon = () => {
  const hasBadge = useUnit(faviconModel.$hasBadge);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) return;

    link.href = hasBadge ? faviconBadge : favicon;
    link.type = 'image/png';
  }, [hasBadge]);

  return null;
};
