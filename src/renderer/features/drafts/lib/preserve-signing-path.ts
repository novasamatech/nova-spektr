import { type Draft } from '@/domains/backend';

/**
 * Carries the saved signing path over to a draft returned by the backend when
 * that response doesn't echo one.
 *
 * `signingPath` parses with a `[]` default, so a trimmed response is
 * indistinguishable from a draft that genuinely has no path — and an empty path
 * now means "unsubmittable". Without this, completing a draft's missing call
 * data could brick the very draft the user is finishing.
 */
export function preserveSigningPath(updated: Draft, current: Draft | null): Draft {
  if (updated.signingPath.length > 0) return updated;
  if (!current || current.signingPath.length === 0) return updated;

  return { ...updated, signingPath: current.signingPath };
}
