const path = require('node:path');

module.exports = {
  /**
   * @param {string} root
   * @param {string} filename
   */
  getPackageName(root, filename) {
    const relativePath = path.relative(root, filename);

    return relativePath.split(path.sep, 2).join(path.sep);
  },
};
