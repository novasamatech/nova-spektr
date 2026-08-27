import { type Address, type BackendContact, type Contact, type LocalContact } from '@/shared/core';
import { toAccountId } from '@/shared/lib/utils';
import { buildContactOptions } from '../accountSuggestions';

const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' as Address;
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' as Address;

function localContact(id: string, name: string, address: Address): LocalContact {
  return { id, name, address, accountId: toAccountId(address), source: 'local' };
}

function backendContact(id: string, name: string, address: Address): BackendContact {
  return {
    id,
    name,
    address,
    accountId: toAccountId(address),
    source: 'backend',
    chainId: null,
    chainName: null,
    derivationPath: null,
    ownerAccountId: null,
    signatories: null,
    threshold: null,
    fields: [],
  };
}

describe('features/extrinsic-builder/lib/accountSuggestions', () => {
  test('two contacts with the same name yield two rows with distinct keys', () => {
    const contacts: Contact[] = [localContact('1', 'Team', ALICE), localContact('2', 'Team', BOB)];

    const options = buildContactOptions({ contacts, searchQuery: '', queryAccountId: null, prefix: 0 });

    expect(options).toHaveLength(2);
    expect(options[0]?.key).not.toBe(options[1]?.key);
    expect(options[0]?.address).not.toBe(options[1]?.address);
  });

  test('keys stay distinct when a local and a backend contact share an id', () => {
    const contacts: Contact[] = [localContact('1', 'Alice', ALICE), backendContact('1', 'Bob', BOB)];

    const options = buildContactOptions({ contacts, searchQuery: '', queryAccountId: null, prefix: 0 });

    expect(new Set(options.map((o) => o.key)).size).toBe(2);
  });

  test('local and backend contacts for the same address collapse into one row, local name wins', () => {
    const contacts: Contact[] = [localContact('1', 'My Alice', ALICE), backendContact('b1', 'Org Alice', ALICE)];

    const options = buildContactOptions({ contacts, searchQuery: '', queryAccountId: null, prefix: 0 });

    expect(options).toHaveLength(1);
    expect(options[0]?.name).toBe('My Alice');
  });

  test('a typed address matches by accountId regardless of ss58 prefix', () => {
    const contacts: Contact[] = [localContact('1', 'Alice', ALICE), localContact('2', 'Bob', BOB)];

    const options = buildContactOptions({
      contacts,
      searchQuery: ALICE,
      queryAccountId: toAccountId(ALICE),
      prefix: 0,
    });

    expect(options.map((o) => o.name)).toEqual(['Alice']);
  });

  test('a text query searches by name', () => {
    const contacts: Contact[] = [localContact('1', 'Alice', ALICE), localContact('2', 'Bob', BOB)];

    const options = buildContactOptions({ contacts, searchQuery: 'bo', queryAccountId: null, prefix: 0 });

    expect(options.map((o) => o.name)).toEqual(['Bob']);
  });
});
