/* eslint-disable import/no-extraneous-dependencies */
const tasks = require('./tasks');
const shell = require('shelljs');

tasks.replaceWebpack();
console.log('[Copy assets]');
console.log('-'.repeat(80));
tasks.copyAssets('buildFirefox');

console.log('[Webpack Build]');
console.log('-'.repeat(80));
shell.exec('webpack --config webpack/prodFirefox.config.js --progress --profile --colors');
