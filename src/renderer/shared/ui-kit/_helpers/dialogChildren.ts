import { isObject } from 'lodash';
import { type ElementType, type ReactNode, Children } from 'react';

import { nonNullable } from '@/shared/lib/utils';

const isElementOfType = (child: ReactNode, type: ElementType): boolean => {
  return nonNullable(child) && isObject(child) && 'type' in child && child.type === type;
};

/**
 * Splits the children of a Radix `Dialog` wrapper into the trigger element,
 * which has to render outside the portal, and the nodes that belong inside
 * `Dialog.Content` — and reports whether the caller supplied a `Title`.
 *
 * Shared by `Modal` and `Drawer`: both accept the same children contract and
 * differ only in layout classes, sizing props and animation, which stay in the
 * components themselves. Compound sub-components are matched by identity, so
 * each caller passes its own `Trigger` and `Title`.
 *
 * `hasTitle` is computed with `some` rather than `find(...) !== null` on
 * purpose. `Array.prototype.find` returns `undefined` when nothing matches,
 * never `null`, so the `!== null` form is unconditionally `true` — `hasTitle`
 * then claims a title exists even when there is none, and the a11y fallback
 * `<Dialog.Title hidden />` becomes unreachable, leaving the dialog without an
 * accessible name. That exact bug was written and fixed twice, once in each
 * component, which is why the check now lives here: keep the predicate
 * boolean.
 */
export const splitDialogChildren = (children: ReactNode, types: { trigger: ElementType; title: ElementType }) => {
  const arrayChildren = Children.toArray(children);

  const triggerNode = arrayChildren.find(child => isElementOfType(child, types.trigger));
  const contentNodes = triggerNode ? arrayChildren.filter(child => child !== triggerNode) : arrayChildren;
  const hasTitle = contentNodes.some(child => isElementOfType(child, types.title));

  return { triggerNode, contentNodes, hasTitle };
};
