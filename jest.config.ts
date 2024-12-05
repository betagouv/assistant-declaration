import dotenv from 'dotenv';
import { getTsconfig } from 'get-tsconfig';
import nextJest from 'next/jest';
import path from 'path';
import { pathsToModuleNameMapper } from 'ts-jest';

import { additionalJestPackages, commonPackages, formatTransformIgnorePatterns } from './transpilePackages';

const createJestConfig = nextJest({
  dir: './',
});

const fullTsconfig = getTsconfig();
if (!fullTsconfig) {
  throw new Error(`a "tsconfig.json" must be provided`);
}

// Load test variables if any
dotenv.config({ path: path.resolve(__dirname, './.env.jest') });
dotenv.config({ path: path.resolve(__dirname, './.env.jest.local') });

// Add any custom config to be passed to Jest
const customJestConfig: Parameters<typeof createJestConfig>[0] = {
  preset: 'ts-jest',
  setupFilesAfterEnv: [],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    '^.+\\.(scss)\\?raw$': '<rootDir>/src/fixtures/rawStyleMock.ts', // `createJestConfig` mocks all styles with `{}` but not our specific `?raw` so we do (note order over other mappers matters)
    ...(fullTsconfig.config.compilerOptions && fullTsconfig.config.compilerOptions.paths
      ? pathsToModuleNameMapper(fullTsconfig.config.compilerOptions.paths, { prefix: '<rootDir>/' })
      : {}),
  },
  testEnvironment: 'jest-environment-jsdom',
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/data/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/data/', '<rootDir>/node_modules/'],
  transformIgnorePatterns: [],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true, // It disables type checking to make it faster (note it's not taken by default from the `tsconfig.json`)
      },
    ],
    '\\.(html|xml|txt)$': '@glen/jest-raw-loader',
  },
};

// Used to specify the default cache directory in our CI/CD environment
// Note: it cannot be set to undefined directly into the config object because Jest would take it due to the object key existing, so using a separate condition
if (typeof process.env.JEST_CACHE_PATH === 'string') {
  customJestConfig.cacheDirectory = process.env.JEST_CACHE_PATH;
}

// [WORKAROUND] To transpile additional dependencies we hack a bit as specified into https://github.com/vercel/next.js/discussions/31152#discussioncomment-1697047
// (and we add our own logic to avoid hardcoding values)
const asyncConfig = createJestConfig(customJestConfig);

const defaultExport = async () => {
  const config = await asyncConfig();

  config.transformIgnorePatterns = formatTransformIgnorePatterns(
    [...commonPackages, ...additionalJestPackages],
    customJestConfig.transformIgnorePatterns ?? []
  );

  return config;
};

export default defaultExport;
