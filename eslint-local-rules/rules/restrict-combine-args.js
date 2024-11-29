/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Restrict effector `combine` method to not more than 3 arguments',
      category: 'Quality',
      recommended: false,
    },

    hasSuggestions: true,
    schema: [],
    messages: {
      invalidArgs: '`combine` must be called with not more than 3 arguments.',
      suggestObject: 'Use object to unite store arguments.',
    },
  },
  create(context) {
    let isEffectorCombine = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'effector') {
          isEffectorCombine = node.specifiers.some((specifier) => specifier.imported?.name === 'combine');
        }
      },
      CallExpression(node) {
        if (isEffectorCombine && node.callee.name === 'combine' && node.arguments.length > 3) {
          const sourceCode = context.sourceCode;
          const args = node.arguments;

          context.report({
            node,
            messageId: 'invalidArgs',
            suggest: [
              {
                messageId: 'suggestObject',
                fix(fixer) {
                  const storeArgs = args.slice(0, -1).map((arg, i) => `    arg${i + 1}: ${sourceCode.getText(arg)}`);
                  const objectArgs = `  {\n${storeArgs.join(',\n')},\n  }`;
                  const remainingArgs = args.slice(-1).map(sourceCode.getText).join(', ');
                  const replacement = `combine(\n${objectArgs},\n${remainingArgs ? `  ${remainingArgs},` : ''}\n)`;

                  return fixer.replaceText(node, replacement);
                },
              },
            ],
          });
        }
      },
    };
  },
};
