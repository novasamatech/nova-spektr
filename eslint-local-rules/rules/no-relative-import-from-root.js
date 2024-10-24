const path = require('node:path');

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
        },
      },
    ],
  },
  create(context) {
    const { root } = context.options[0] || { root: '' };
    const absoluteRoot = path.resolve(root);

    return {
      ImportDeclaration(node) {
        const { source } = node;
        if (source.type !== 'Literal') {
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
          context.report({
            node,
            message: `Relative import through root is forbidden.`,
          });
        }
      },
    };
  },
};
