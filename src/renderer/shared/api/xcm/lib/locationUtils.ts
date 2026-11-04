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

/**
 * Account named by a location's interior (`AccountId32` / `AccountKey20`
 * junction). Takes a location object, a `{ vN: location }` wrapper, or the JSON
 * string of either, in any XCM version (v3 `X1` is a single junction, v4+ an
 * array). `undefined` when there is no readable account.
 */
export const extractAccountIdFromLocation = (value: unknown): AccountId | undefined => {
  const location = unwrapVersioned(parseXcmValue(value));
  if (!isRecord(location) || !isRecord(location.interior)) return undefined;

  for (const [key, junctions] of Object.entries(location.interior)) {
    if (!isJunctionKey(key)) continue;

    for (const junction of Array.isArray(junctions) ? junctions : [junctions]) {
      const accountId = getJunctionAccountId(junction);
      if (accountId) return accountId;
    }
  }

  return undefined;
};

/** Instructions whose body is a nested program (`[Instruction]`). */
const NESTED_PROGRAM_INSTRUCTIONS = new Set(['setappendix', 'seterrorhandler']);
/** Instruction fields holding a program to run on another chain. */
const NESTED_PROGRAM_FIELDS = ['xcm', 'remoteXcm'];
/** Instructions that run an opaque call on the destination: unreadable. */
const OPAQUE_INSTRUCTIONS = new Set(['transact']);

type Beneficiaries = { accountIds: AccountId[]; unresolved: boolean };

const collectProgramBeneficiaries = (program: unknown, into: Beneficiaries): void => {
  if (!Array.isArray(program)) {
    into.unresolved = true;

    return;
  }

  // Direct deposits first, nested programs (appendix, remote chain) after —
  // the first result is the recipient worth showing.
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

      for (const field of NESTED_PROGRAM_FIELDS) {
        if (field in body) nested.push(body[field]);
      }
    }
  }

  for (const nestedProgram of nested) {
    collectProgramBeneficiaries(nestedProgram, into);
  }
};

/**
 * Every account an XCM program deposits into: each `DepositAsset` /
 * `TransferAsset` beneficiary, including those inside `SetAppendix`,
 * `SetErrorHandler` and the programs forwarded to another chain by
 * `DepositReserveAsset`, `InitiateTeleport`, `InitiateTransfer` and friends.
 * Takes a `{ vN: [Instruction] }` program or its JSON string. `null` when the
 * program can't be read or any of its beneficiaries can't — or it runs an
 * opaque `Transact`.
 */
export const extractBeneficiariesFromXcmInstructions = (value: unknown): AccountId[] | null => {
  const result: Beneficiaries = { accountIds: [], unresolved: false };

  collectProgramBeneficiaries(unwrapVersioned(parseXcmValue(value)), result);

  return result.unresolved ? null : result.accountIds;
};
