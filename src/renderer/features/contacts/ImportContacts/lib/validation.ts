import { z } from 'zod';

import { sanitizeContactName, validateAddress } from '@/shared/lib/utils';

export const contactImportSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Contact name is required')
      .max(256, 'Contact name is too long')
      .transform(sanitizeContactName),
    address: z
      .string()
      .min(1, 'Contact address is required')
      .refine((address) => validateAddress(address), 'Invalid address format'),
  })
  .passthrough(); // Allow additional fields like isFavorite, metadata, etc.

export const contactsArraySchema = z.array(contactImportSchema).min(0);

export type ContactImport = z.infer<typeof contactImportSchema>;
