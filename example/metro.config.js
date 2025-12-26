// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add watchFolders to include the parent directory (where the local package is)
config.watchFolders = [
  __dirname,
  path.resolve(__dirname, '..'), // Parent directory
];

// Ensure node_modules resolution includes parent directory
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

// Add source extensions for TypeScript
config.resolver.sourceExts.push('ts', 'tsx');

module.exports = config;

