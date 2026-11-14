const path = require('path');

module.exports = {
  diff: true,
  extension: ['js', 'cjs', 'mjs'],
  package: './package.json',
  reporter: 'mochawesome',
  'reporter-option': [
    'reportDir=reports',
    'reportFilename=index',
    'html=true',
    'json=true',
    'overwrite=true',
    'charts=true',
    'code=false',
    'timestamp=yyyy-mm-dd_HH-MM-ss',
  ],
  slow: '5000',
  timeout: '60000',
  ui: 'bdd',
  spec: ['tests/**/*.spec.js'],
  exit: true,
};
