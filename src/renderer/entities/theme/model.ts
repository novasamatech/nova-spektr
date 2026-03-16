import { createEffect, createEvent, createStore, sample } from 'effector';
import { persist } from 'effector-storage/local';

export type Theme = 'light' | 'dark';

const applyThemeFx = createEffect((theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
});

export const themeChanged = createEvent<Theme>();
export const themeToggled = createEvent();

export const $theme = createStore<Theme>('light');

$theme.on(themeChanged, (_, theme) => theme).on(themeToggled, (current) => (current === 'light' ? 'dark' : 'light'));

persist({ key: 'nova-spektr-theme', store: $theme, sync: true });

sample({ clock: $theme, target: applyThemeFx });
