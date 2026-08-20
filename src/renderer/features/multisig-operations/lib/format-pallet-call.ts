const capitalize = (value: string) => `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;

/**
 * Raw `pallet · Call` label for the Details panel — verification data a signer
 * can compare against the Vault screen, so the names are NOT humanised (unlike
 * `formatSectionAndMethod`, which produces the row title "Balances: Transfer
 * keep alive").
 */
export const formatPalletCall = (section: string | null | undefined, method: string | null | undefined) => {
  if (!section || !method) return null;

  return `${capitalize(section)} · ${capitalize(method)}`;
};
