import { type ApiPromise } from '@polkadot/api';

const capitalize = (s: string) => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1));

const humanize = (s: string) => {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
};

export const generateTemplateName = (api: ApiPromise | null, callData: string): string => {
  if (!api || !callData.startsWith('0x')) {
    return 'Untitled template';
  }

  try {
    const extrinsicCall = api.createType('Call', callData);
    const { method, section } = api.registry.findMetaCall(extrinsicCall.callIndex);

    return `${humanize(section)}: ${humanize(method)}`;
  } catch {
    return 'Untitled template';
  }
};
