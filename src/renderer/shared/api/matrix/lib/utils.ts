import { MATRIX_FULL_USERNAME_REGEX, MATRIX_SHORT_USERNAME_REGEX } from './constants';

/**
 * Validate full username with server prefix Example:
 *
 * @param value User name value
 *
 * @returns {Boolean}
 *
 * @my_name:matrix.org
 */
export const validateFullUserName = (value: string): boolean => {
  return MATRIX_FULL_USERNAME_REGEX.test(value);
};

/**
 * Validate short username without server prefix Example:
 * my_name not @my_name:matrix.org
 *
 * @param value User name value
 *
 * @returns {Boolean}
 */
export const validateShortUserName = (value: string): boolean => {
  return MATRIX_SHORT_USERNAME_REGEX.test(value);
};
