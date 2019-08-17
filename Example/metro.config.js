const path = require('path');
const blacklist = require('metro-config/src/defaults/blacklist');

const root = path.resolve(__dirname, '..');

module.exports = {
  projectRoot: path.resolve(__dirname, '.'),

  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false
      }
    })
  },
  watchFolders: [path.resolve(__dirname, 'node_modules'), root],
  resolver: {
    blacklistRE: blacklist([new RegExp(`${root}/node_modules/react-native/.*`)])
  }
};
