import { toAccountId, validateAddress } from '@/shared/lib/utils';
import { type AccountId } from '@/shared/polkadotjs-schemas';

type JsonObject = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Matches XCM junction keys like x1, x2, X3, etc. */
const isJunctionKey = (key: string): boolean => /^x\d+$/i.test(key);

/** Matches a VersionedLocation / VersionedXcm wrapper key like v3, V4. */
const isVersionKey = (key: string): boolean => /^v\d+$/i.test(key);

/** Junctions that name an account, and the field holding its key. */
const ACCOUNT_JUNCTION_FIELDS: Record<string, string> = {
  accountid32: 'id',
  accountkey20: 'key',
};
/** Every junction that names an account — an index one has no key to read. */
const ACCOUNT_JUNCTIONS = new Set([...Object.keys(ACCOUNT_JUNCTION_FIELDS), 'accountindex64']);

/**
 * Accepts either a decoded JSON object or its string form (the call data
 * decoder stringifies every arg). Anything that isn't valid JSON is
 * `undefined`.
 */
const parseXcmValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/** `{ v4: inner }` → `inner`; anything else is returned as is. */
const unwrapVersioned = (value: unknown): unknown => {
  if (!isRecord(value)) return value;

  const keys = Object.keys(value);

  return keys.length === 1 && isVersionKey(keys[0]!) ? value[keys[0]!] : value;
};

const getJunctionAccountId = (junction: unknown): AccountId | undefined => {
  if (!isRecord(junction)) return undefined;

  for (const [name, body] of Object.entries(junction)) {
    const field = ACCOUNT_JUNCTION_FIELDS[name.toLowerCase()];
    if (!field || !isRecord(body)) continue;

    const key = body[field];

    return typeof key === 'string' && validateAddress(key) ? toAccountId(key) : undefined;
  }

  return undefined;
};

const isAccountJunction = (junction: unknown): boolean =>
  isRecord(junction) && Object.keys(junction).some((name) => ACCOUNT_JUNCTIONS.has(name.toLowerCase()));

/**
 * Junctions of a location's interior. Takes a location object, a versioned
 * wrapper around one (`{ vN: location }`), or the JSON string of either, in any
 * XCM version (v3 `X1` is a single junction, v4+ an array).
 */
const getLocationJunctions = (value: unknown): unknown[] => {
  const location = unwrapVersioned(parseXcmValue(value));
  if (!isRecord(location) || !isRecord(location.interior)) return [];

  return Object.entries(location.interior).flatMap(([key, junctions]) => (isJunctionKey(key) ? junctions : []));
};

/**
 * Account named by a location's interior (`AccountId32` / `AccountKey20`
 * junction), in any form `getLocationJunctions` takes. `undefined` when there
 * is no readable account.
 */
export const extractAccountIdFromLocation = (value: unknown): AccountId | undefined => {
  for (const junction of getLocationJunctions(value)) {
    const accountId = getJunctionAccountId(junction);
    if (accountId) return accountId;
  }

  return undefined;
};

/**
 * Account a forwarding location names. `undefined` for a location that names
 * none (a chain); `null` when it names one that can't be read.
 */
const readForwardAccountId = (value: unknown): AccountId | null | undefined => {
  let forwardAccountId: AccountId | undefined;

  for (const junction of getLocationJunctions(value)) {
    if (!isAccountJunction(junction)) continue;

    const accountId = getJunctionAccountId(junction);
    if (!accountId) return null;

    forwardAccountId ??= accountId;
  }

  return forwardAccountId;
};

/** Instructions whose body is a nested program (`[Instruction]`). */
const NESTED_PROGRAM_INSTRUCTIONS = new Set(['setappendix', 'seterrorhandler']);
/** Instruction fields holding a program to run on another chain, lower-cased. */
const NESTED_PROGRAM_FIELDS = new Set(['xcm', 'remotexcm']);
/** Instructions that run an opaque call on the destination: unreadable. */
const OPAQUE_INSTRUCTIONS = new Set(['transact']);
/**
 * Instructions that forward assets to a location, and the field naming it. The
 * location is usually a chain; when it names an account, that account is paid.
 */
const FORWARD_LOCATION_FIELDS: Record<string, string> = {
  transferreserveasset: 'dest',
  depositreserveasset: 'dest',
  initiateteleport: 'dest',
  initiatereservewithdraw: 'reserve',
  initiatetransfer: 'destination',
};

type Beneficiaries = { accountIds: AccountId[]; forwardAccountIds: AccountId[]; unresolved: boolean };

const collectProgramBeneficiaries = (program: unknown, into: Beneficiaries): void => {
  if (!Array.isArray(program)) {
    into.unresolved = true;

    return;
  }

  // Direct deposits first, nested programs (appendix, remote chain) after —
  // the first result is the recipient worth showing. Accounts of forwarding
  // locations are kept apart and listed last.
  const nested: unknown[] = [];

  for (const instruction of program) {
    if (!isRecord(instruction)) {
      into.unresolved = true;
      continue;
    }

    for (const [name, body] of Object.entries(instruction)) {
      const instructionName = name.toLowerCase();

      if (OPAQUE_INSTRUCTIONS.has(instructionName)) into.unresolved = true;
      if (NESTED_PROGRAM_INSTRUCTIONS.has(instructionName)) nested.push(body);
      if (!isRecord(body)) continue;

      if ('beneficiary' in body) {
        const accountId = extractAccountIdFromLocation(body.beneficiary);
        if (accountId) into.accountIds.push(accountId);
        else into.unresolved = true;
      }

      const forwardField = FORWARD_LOCATION_FIELDS[instructionName];
      const forwardAccountId = forwardField ? readForwardAccountId(body[forwardField]) : undefined;
      if (forwardAccountId) into.forwardAccountIds.push(forwardAccountId);
      else if (forwardAccountId === null) into.unresolved = true;

      for (const [field, value] of Object.entries(body)) {
        if (NESTED_PROGRAM_FIELDS.has(field.toLowerCase())) nested.push(value);
      }
    }
  }

  for (const nestedProgram of nested) {
    collectProgramBeneficiaries(nestedProgram, into);
  }
};

/**
 * Every account an XCM program pays: each `DepositAsset` / `TransferAsset`
 * beneficiary, including those inside `SetAppendix`, `SetErrorHandler` and the
 * programs forwarded to another chain by `DepositReserveAsset`,
 * `InitiateTeleport`, `InitiateTransfer` and friends — and, after all of those,
 * the account such an instruction forwards to, when its location names one.
 *
 * Takes a `{ vN: [Instruction] }` program or its JSON string. `null` when the
 * program can't be read or any account it names can't, when it runs an opaque
 * `Transact`, or when it names no account at all: a program that moves assets
 * without saying to whom is never "pays no one".
 */
export const extractBeneficiariesFromXcmInstructions = (value: unknown): AccountId[] | null => {
  const result: Beneficiaries = { accountIds: [], forwardAccountIds: [], unresolved: false };

  collectProgramBeneficiaries(unwrapVersioned(parseXcmValue(value)), result);

  const accountIds = [...result.accountIds, ...result.forwardAccountIds];

  return result.unresolved || accountIds.length === 0 ? null : accountIds;
};
