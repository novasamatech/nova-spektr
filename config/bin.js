import { get } from 'lodash-es';

import * as variables from './index.js';

const selectedVariable = process.argv.slice(2)[0];

if (!selectedVariable) {
  process.stderr.write('Variable not passed.');
  process.exit(1);
}

const value = get(variables, selectedVariable);

if (!value) {
  process.stderr.write(`${selectedVariable}: variable not found.`);
  process.exit(1);
}

process.stdout.write(value.toString());
