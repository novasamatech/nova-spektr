import path from 'path';

import camelcase from 'camelcase';

/**
 * Custom Jest transformer turning file imports into filenames
 * http://facebook.github.io/jest/docs/en/webpack.html
 */
function process(src, filename) {
  const assetFilename = JSON.stringify(path.basename(filename));
  if (!filename.match(/\.svg/)) {
    return {
      code: `module.exports = ${assetFilename};`,
    };
  }

  const pascalCaseFilename = camelcase(path.parse(filename).name, { pascalCase: true });
  const componentName = `Svg${pascalCaseFilename}`;

  return {
    code: `const React = require('react');
      module.exports = {
        __esModule: true,
        default: ${assetFilename},
        ReactComponent: React.forwardRef(function ${componentName}(props, ref) {
          return {
            $$typeof: Symbol.for('react.element'),
            type: 'svg',
            ref: ref,
            key: null,
            props: Object.assign({}, props, {
              children: ${assetFilename}
            })
          };
        }),
      };`,
  };
}

export default { process };
