import { Chain } from '@shared/core';

export const isRegularProxy = (chain: Chain) => chain.options?.includes('regular_proxy');
