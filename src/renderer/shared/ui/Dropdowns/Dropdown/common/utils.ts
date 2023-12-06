import { ButtonOption, LinkOption } from './types';

export const dropdownUtils = {
  isLinkOption,
};

function isLinkOption(option: LinkOption | ButtonOption): option is LinkOption {
  return 'to' in option;
}
