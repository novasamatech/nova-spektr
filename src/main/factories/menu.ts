import { app, shell, Menu, MenuItem, MenuItemConstructorOptions } from 'electron';

import { PLATFORM } from '../shared/constants/platform';
import { ENVIRONMENT } from '../shared/constants/environment';

export function buildMenuTemplate(): Menu {
  const template: MenuItemConstructorOptions[] | MenuItem[] = [
    {
      label: 'Edit',
      accelerator: 'e',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'pasteAndMatchStyle', label: 'Paste and Match Style' },
        { role: 'delete', label: 'Delete' },
        { role: 'selectAll', label: 'Select All' },
      ],
    },
    {
      label: 'View',
      accelerator: 'V',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+Num0', visible: false },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+NumAdd', visible: false },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+NumSub', visible: false },
        { role: 'resetZoom', label: 'Actual Size' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' },
      ],
    },
    {
      label: 'Window',
      accelerator: 'w',
      role: 'window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'close', label: 'Close' },
      ],
    },
    {
      label: 'Help',
      accelerator: 'h',
      role: 'help',
      submenu: [
        {
          label: 'Nova Spektr Help',
          click() {
            shell.openExternal('https://docs.novaspektr.io/');
          },
        },
      ],
    },
  ];

  if (ENVIRONMENT.IS_STAGE || ENVIRONMENT.IS_DEV) {
    const viewSubmenu = template[1].submenu as MenuItemConstructorOptions[];
    if (viewSubmenu) {
      viewSubmenu.push({
        role: 'toggleDevTools',
        label: 'Toggle Developer Tools',
      });
    }
  }

  // macOS has specific menu conventions
  if (PLATFORM.IS_MAC) {
    template.unshift({
      // first macOS menu is the name of the app
      role: 'appMenu',
      label: app.name,
      submenu: [
        { role: 'about', label: 'About Nova Spektr' },
        { type: 'separator' },
        { role: 'hide', label: 'Hide' },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Unhide' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' },
      ],
    });

    // Window menu
    // This also has specific functionality on macOS
    template[3].submenu = [
      { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
      { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: 'Zoom', role: 'zoom' },
    ];
  } else {
    template.unshift({
      label: 'File',
      accelerator: 'f',
      submenu: [{ role: 'quit', label: 'Quit' }],
    });
  }

  return Menu.buildFromTemplate(template);
}
