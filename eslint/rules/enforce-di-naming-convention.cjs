const { camelCase } = require('lodash');

const {
  isIdentifier,
  isCallExpression,
  isMemberExpression,
  isImportedFrom,
  getCalleeNameFromExpression,
} = require('../astHelpers.cjs');

const IDENTIFIERS_SUFFIXES = {
  createSlot: 'Slot',
  createPipeline: 'Pipeline',
  createAsyncPipeline: 'AsyncPipeline',
  createAnyOf: 'AnyOf',
};

const fixName = (name, suffix) => camelCase(name.replace(new RegExp(suffix, 'gi'), '').replace(/\$/g, '') + suffix);

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Naming convention for identifiers.',
      category: 'Quality',
      recommended: true,
    },

    hasSuggestions: true,

    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          identifierCreators: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          importSources: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    ],
  },
  create(context) {
    const settings = context.options[0] || {};
    const functionsMap = {
      ...IDENTIFIERS_SUFFIXES,
      ...(settings.identifierCreators || {}),
    };
    const importSources = [/@\/shared\/di/, ...(settings.importSources || [])];

    return {
      VariableDeclarator(node) {
        const callExpression = node.init;
        const variableNameNode = node.id;

        if (
          !isIdentifier(variableNameNode) ||
          !isCallExpression(callExpression) ||
          !(isIdentifier(callExpression.callee) || isMemberExpression(callExpression.callee))
        ) {
          return;
        }

        const variableName = variableNameNode.name;
        const functionIdentifier = getCalleeNameFromExpression(callExpression);
        if (!functionIdentifier || !(functionIdentifier.name in functionsMap)) {
          return;
        }

        if (!isImportedFrom(callExpression, importSources, context.getScope())) {
          return;
        }

        const suffix = functionsMap[functionIdentifier.name];
        const fixedName = fixName(variableName, suffix);
        if (variableName.toLowerCase() === fixedName.toLowerCase()) {
          return;
        }

        context.report({
          node: variableNameNode,
          message: `Variable name "${variableName}" is not valid.`,
          suggest: [
            {
              desc: `Replace name with "${fixedName}"`,
              fix(fixer) {
                return fixer.replaceText(variableNameNode, fixedName);
              },
            },
          ],
        });
      },
    };
  },
};
