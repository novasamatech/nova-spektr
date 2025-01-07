const path = require('node:path');

const { default: importResolve } = require('eslint-module-utils/resolve');

const { isLiteral } = require('../astHelpers.cjs');
const { getPackageName } = require('../utils.cjs');

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Simple check for package self-import',
      category: 'Quality',
      recommended: true,
    },

    hasSuggestions: true,
    fixable: 'code',

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
    const { root, exclude = [] } = context.options[0] || { root: '', exclude: [] };

    const excludedSet = exclude.map((x) => path.resolve(root, x));
    const importCache = new Map();
    const excludedCache = new Set();

    const resolveImportCached = (path) => {
      const key = path + '|' + context.filename;
      if (importCache.has(key)) {
        return importCache.get(key) ?? '';
      }
      const res = importResolve(path, context);
      importCache.set(key, res);

      return res;
    };

    const isExcludedCached = (filename) => {
      const dir = path.dirname(filename);

      if (excludedCache.has(dir)) {
        return true;
      }

      for (const excluded of excludedSet) {
        if (dir.startsWith(excluded)) {
          excludedCache.add(dir);

          return true;
        }
      }

      return false;
    };

    return {
      ImportDeclaration(node) {
        if (isExcludedCached(context.filename)) {
          return;
        }

        const { source } = node;
        if (!isLiteral(source)) {
          return;
        }

        const requestPath = source.value.toString();

        // Child import
        if (requestPath.startsWith('./')) {
          return;
        }

        // Resolving request
        const resolvedDestination = resolveImportCached(requestPath);
        if (!resolvedDestination || resolvedDestination.includes('node_modules')) {
          return;
        }

        // Comparing packages
        const sourcePackage = getPackageName(root, context.filename);
        const destinationPackage = getPackageName(root, resolvedDestination);

        if (sourcePackage !== destinationPackage) {
          return;
        }

        // Finding index file
        const potentialIndexPath = path.resolve(root, sourcePackage, 'index');

        if (resolvedDestination.startsWith(potentialIndexPath)) {
          context.report({
            node,
            message: `Self import through index file is forbidden.`,
          });

          return;
        }

        // Simple parent request
        if (requestPath.startsWith(`../`)) {
          return;
        }

        const sourcePath = path.relative(root, context.filename);
        const destinationPath = path.relative(root, resolvedDestination);

        const relative = path.relative(path.dirname(context.filename), resolvedDestination);
        const parsed = path.parse(relative);
        const replacedPath = path.join(parsed.dir, parsed.name);

        context.report({
          node,
          message: `Self import through alias is forbidden.\n${sourcePath}\n${destinationPath}`,
          suggest: [
            {
              desc: `Replace with relative path ${replacedPath}`,
              fix(fixer) {
                const stringQ = source.raw.charAt(0);

                return fixer.replaceText(source, `${stringQ}${replacedPath}${stringQ}`);
              },
            },
          ],
        });
      },
    };
  },
};
