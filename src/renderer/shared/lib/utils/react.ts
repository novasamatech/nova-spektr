import React, { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function isEmptyComponent(node: ReactNode): boolean {
  if (node == null || node === false || node === '') {
    return true;
  }

  if (React.isValidElement(node)) {
    try {
      return !renderToStaticMarkup(node);
    } catch (e) {
      // Can throw error for custom components and it means we have content inside
      return false;
    }
  }

  return false;
}
