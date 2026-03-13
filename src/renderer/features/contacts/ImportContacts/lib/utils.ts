import { type Contact } from '@/shared/core';
import { sanitizeContactName, toAccountId } from '@/shared/lib/utils';

import { type AccountIdConflict } from './types';
import { type ContactImport, contactsArraySchema } from './validation';

export const contactImportUtils = {
  parseJSON,
  detectAccountIdConflicts,
  resolveNameConflicts,
};

type ParseResult = { success: true; data: ContactImport[] } | { success: false };

async function parseJSON(file: File): Promise<ParseResult> {
  const content = await file.text();

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return { success: false };
  }

  if (!Array.isArray(data)) {
    return { success: false };
  }

  const result = contactsArraySchema.safeParse(data);
  if (!result.success) {
    return { success: false };
  }

  const parsed = result.data;

  const MAX_CONTACTS = 10000;
  if (parsed.length > MAX_CONTACTS) {
    return { success: false };
  }

  // Sanitize contact names before returning
  const sanitized = parsed.map((contact) => ({
    ...contact,
    name: sanitizeContactName(contact.name),
  }));

  // Filter out contacts whose name becomes empty after sanitization
  const valid = sanitized.filter((contact) => contact.name.length > 0);

  return { success: true, data: valid };
}

function detectAccountIdConflicts(contacts: ContactImport[], existingContacts: Contact[]): AccountIdConflict[] {
  const conflicts: AccountIdConflict[] = [];

  for (const contact of contacts) {
    const accountId = toAccountId(contact.address);
    const existingContact = existingContacts.find((c) => c.accountId === accountId);

    if (existingContact) {
      conflicts.push({
        imported: { name: contact.name, address: contact.address, accountId },
        existing: {
          id: existingContact.id,
          name: existingContact.name,
          address: existingContact.address,
          accountId: existingContact.accountId,
        },
      });
    }
  }

  return conflicts;
}

function resolveNameConflicts(
  contacts: ContactImport[],
  existingContacts: Contact[],
): { name: string; address: string; accountId: string }[] {
  // Use sanitized names for all comparisons to prevent optical duplicates
  const allExistingNames = new Set(existingContacts.map((c) => sanitizeContactName(c.name).toLowerCase()));
  const usedNames = new Set<string>();
  const resolved: { name: string; address: string; accountId: string }[] = [];

  for (const contact of contacts) {
    const accountId = toAccountId(contact.address);
    const sanitizedName = sanitizeContactName(contact.name);
    let finalName = sanitizedName;
    let nameIndex = 1;

    const existingWithSameName = existingContacts.find(
      (c) => sanitizeContactName(c.name).toLowerCase() === sanitizedName.toLowerCase(),
    );
    const isAccountIdConflict = existingWithSameName && existingWithSameName.accountId === accountId;

    if (!isAccountIdConflict && allExistingNames.has(finalName.toLowerCase())) {
      while (
        allExistingNames.has(`${finalName} (${nameIndex})`.toLowerCase()) ||
        usedNames.has(`${finalName} (${nameIndex})`.toLowerCase())
      ) {
        nameIndex++;
      }
      finalName = `${finalName} (${nameIndex})`;
    }

    // Also check for duplicates within the imported file
    if (usedNames.has(finalName.toLowerCase())) {
      nameIndex = 1;
      while (
        allExistingNames.has(`${sanitizedName} (${nameIndex})`.toLowerCase()) ||
        usedNames.has(`${sanitizedName} (${nameIndex})`.toLowerCase())
      ) {
        nameIndex++;
      }
      finalName = `${sanitizedName} (${nameIndex})`;
    }

    usedNames.add(finalName.toLowerCase());
    resolved.push({ name: finalName, address: contact.address, accountId });
  }

  return resolved;
}
