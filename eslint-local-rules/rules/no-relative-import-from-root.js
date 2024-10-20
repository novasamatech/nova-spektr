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
    const forbiddenCache = new Set();

    const isForbidden = (path) => {
      if (forbiddenCache.has(path)) {
        return true;
      }

      if (path.split('/').length <= 1) {
        forbiddenCache.add(path);

        return true;
      }

      return false;
    };

    return {
      ImportDeclaration(node) {
        const { source } = node;
        if (!source.value) {
          return;
        }

        const requestPath = source.value.toString();
        // Not relative import to parent
        if (!requestPath.startsWith('../')) {
          return;
        }

        const absolute = path.resolve(path.dirname(context.filename), requestPath);
        const relativeFromRoot = path.relative(root, absolute);

        if (isForbidden(relativeFromRoot)) {
          context.report({
            node,
            message: `Relative import through root is forbidden.`,
          });
        }
      },
    };
  },
};
