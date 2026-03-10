import { createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

const $folded = createStore(false);
const toggled = createEvent();

sample({ clock: toggled, source: $folded, fn: (f) => !f, target: $folded });

persist({ key: 'sidebar-folded', store: $folded });

export const sidebarModel = { $folded, toggled };
