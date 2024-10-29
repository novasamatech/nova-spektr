const hasOwnProperty = Object.prototype.hasOwnProperty;

function shallowEqual(original, comparison) {
  if (!original || !comparison) {
    return true;
  }

  const keys = Object.keys(comparison);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!key || !hasOwnProperty.call(original, key) || !Object.is(original[key], comparison[key])) {
      return false;
    }
  }

  return true;
}

function isIdentifier(x, v) {
  return x && x.type === 'Identifier' && shallowEqual(x, v);
}

function isMemberExpression(x, v) {
  return x && x.type === 'MemberExpression' && shallowEqual(x, v);
}

function isCallExpression(x, v) {
  return x && x.type === 'CallExpression' && shallowEqual(x, v);
}

function isLiteral(x, v) {
  return x && x.type === 'Literal' && shallowEqual(x, v);
}

function isImportDeclaration(x, v) {
  return x && x.type === 'ImportDeclaration' && shallowEqual(x, v);
}

function isVariableDeclarator(x, v) {
  return x && x.type === 'VariableDeclarator' && shallowEqual(x, v);
}

/**
 * @param importSources {(string | RegExp)[]}
 * @param source {string}
 *
 * @returns {boolean}
 */
function isInImportSources(importSources, source) {
  return importSources.some((x) => {
    if (typeof x === 'string') {
      return x === source;
    }

    return x.test(source);
  });
}

/**
 * @param node {import("estree").Expression}
 * @param importSources {(string | RegExp)[]}
 * @param scope {import("eslint").Scope.Scope}
 *
 * @returns {boolean}
 */
function isImportedFrom(node, importSources, scope) {
  const referenceToFind = getIdentifierFromExpression(node);
  if (!referenceToFind) {
    return false;
  }

  const binding = scope.set.get(referenceToFind.name);
  if (!binding) {
    return false;
  }

  const importDef = binding.defs.find((x) => x.type === 'ImportBinding');

  // ES6 module
  if (
    importDef &&
    isImportDeclaration(importDef.parent) &&
    isLiteral(importDef.parent.source) &&
    isInImportSources(importSources, importDef.parent.source.value)
  ) {
    return true;
  }

  const variableDef = binding.defs.find((x) => x.type === 'Variable');

  // commonjs module
  if (
    variableDef &&
    isVariableDeclarator(variableDef.node) &&
    isCallExpression(variableDef.node.init) &&
    isIdentifier(variableDef.node.init.callee, { name: 'require' }) &&
    isLiteral(variableDef.node.init.arguments[0]) &&
    isInImportSources(importSources, variableDef.node.init.arguments[0].value)
  ) {
    return true;
  }

  return false;
}

/**
 * @param node {import("estree").Expression}
 *
 * @returns {import('estree').Identifier | null}
 */
function getIdentifierFromExpression(node) {
  if (isIdentifier(node.callee)) {
    // clean function call ("createSlot()")
    return node.callee;
  } else if (isMemberExpression(node.callee) && isIdentifier(node.callee.object)) {
    // function call from namespace ("hedron.createSlot()")
    return node.callee.object;
  } else {
    return null;
  }
}

/**
 * @param node {import("estree").Expression}
 *
 * @returns {import('estree').Identifier | null}
 */
function getCalleeNameFromExpression(node) {
  if (isIdentifier(node.callee)) {
    return node.callee;
  }

  if (isMemberExpression(node.callee) && isIdentifier(node.callee.property)) {
    return node.callee.property;
  }

  return null;
}

module.exports = {
  isIdentifier,
  isMemberExpression,
  isCallExpression,
  isVariableDeclarator,
  isLiteral,
  isImportDeclaration,

  isImportedFrom,
  getCalleeNameFromExpression,
  getIdentifierFromExpression,
};
