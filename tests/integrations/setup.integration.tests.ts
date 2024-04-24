// Adding fake indexdb for fix
//      🔶 Matrix original error object: Error: Missing required option: indexedDB 🔶
import 'fake-indexeddb/auto';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
// Adding fetch function to run such code without problem:
// https://github.com/novasamatech/nova-spektr/blob/b855567d98587e6b83ce248e524505a5a3a3ba76/src/renderer/services/matrix/matrix.ts#L101-L102
// https://github.com/mswjs/msw/issues/686
import 'whatwg-fetch';

if (!global.indexedDB) {
  global.indexedDB = new FDBFactory();
}

module.exports = async () => {
  // Mock wasm file for Matrix library import:
  // jest.mock('@matrix-org/olm/olm.wasm', () => {
  //   return 'node_modules/@matrix-org/olm/olm.wasm';
  // });

  // Load request before all other modules it is tricky solution for
  //      🔶 Matrix original error object: TypeError: this.opts.request is not a function 🔶
  // https://github.com/matrix-org/matrix-js-sdk/issues/2415#issuecomment-1188812401
  // matrix.request(request);

  // Adding crypto.randomBytes for Matrix client initialization
  const crypto = require('crypto');

  Object.defineProperty(global.self, 'crypto', {
    value: {
      getRandomValues: (arr: string | any[]) => crypto.randomBytes(arr.length),
    },
  });

  jest.setTimeout(60_000); // in milliseconds
};
