const path = require('node:path');

const { isLiteral } = require('../astHelpers.cjs');
const { getPackageName } = require('../utils.cjs');

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Simple check for packages relative import up to root',
      category: 'Quality',
      recommended: true,
    },

    schema: [
      {
        type: 'object',
        additionalProperties: false,
        required: ['root'],
        properties: {
          root: { type: 'string' },
          exclude: { type: 'array', items: { type: 'string' } },
        },
      },
    ],
  },
  create(context) {
    const { root, exclude = [] } = context.options[0] || { root: '' };
    const absoluteRoot = path.resolve(root);
    const absoluteExcluded = new Set(exclude.map((x) => path.resolve(absoluteRoot, x)));

    return {
      ImportDeclaration(node) {
        const { source } = node;
        if (!isLiteral(source)) {
          return;
        }

        const requestPath = source.value.toString();
        // Not relative import to parent
        if (!requestPath.startsWith('../')) {
          return;
        }

        const upDir = requestPath.replace(/[A-z-]+.+/, '');
        const possibleRoot = path.resolve(path.dirname(context.filename), upDir);

        if (possibleRoot === absoluteRoot) {
          return context.report({
            node,
            message: `Relative import through root is forbidden.`,
          });
        }

        const requestedResource = path.resolve(path.dirname(context.filename), requestPath);

        if (absoluteExcluded.has(requestedResource)) {
          return;
        }

        const sourcePackage = getPackageName(absoluteRoot, context.filename);
        const requestedPackage = getPackageName(absoluteRoot, requestedResource);

        if (sourcePackage !== requestedPackage) {
          return context.report({
            node,
            message: `Relative to another package is forbidden.\n${sourcePackage}\n${requestedPackage}`,
          });
        }
      },
    };
  },
};
