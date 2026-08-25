/**
 * Draft sentences other features have to reuse verbatim.
 *
 * A surface that merely _predicts_ whether a draft is possible — a dashboard
 * row deciding whether to offer an action — has to explain a refusal in the
 * same words the drafts list uses for the same rule, or the user learns two
 * names for one thing. Sharing the key rather than the string means a rename
 * here cannot leave another feature rendering a raw i18n path.
 *
 * The literal stays spelled out at the `t()` call sites inside this feature on
 * purpose: `i18n:check` (i18next-parser) extracts keys by scanning for literal
 * arguments, and a key referenced only through a constant would be dropped from
 * `en.json` on the next run.
 */
export const DRAFT_NO_WRITE_PERMISSION_KEY = 'operations.drafts.noWritePermission';
