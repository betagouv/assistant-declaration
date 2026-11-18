import dotenv from 'dotenv';
import { getTsconfig } from 'get-tsconfig';
import nextJest from 'next/jest.js';
import path from 'path';
import { pathsToModuleNameMapper } from 'ts-jest';

const createJestConfig = nextJest({
  dir: './',
});

const fullTsconfig = getTsconfig();
if (!fullTsconfig) {
  throw new Error(`a "tsconfig.json" must be provided`);
}

// Load test variables if any
dotenv.config({ path: path.resolve(import.meta.dirname, './.env.jest') });
dotenv.config({ path: path.resolve(import.meta.dirname, './.env.jest.local') });

// Add any custom config to be passed to Jest
const customJestConfig: Parameters<typeof createJestConfig>[0] = {
  preset: 'ts-jest',
  setupFilesAfterEnv: [],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  moduleNameMapper: {
    'pretty-bytes': '<rootDir>/src/fixtures/pretty-bytes-mock.js',
    '@octokit/rest': '<rootDir>/src/fixtures/octokit-mock.js',
    '@sindresorhus/slugify': '<rootDir>/src/fixtures/slugify-mock.js',
    '\\.email\\.scss\\?raw$': '<rootDir>/src/fixtures/rawImportMock.js',
    '\\.storybook\\.scss\\?raw$': '<rootDir>/src/fixtures/rawImportMock.js',
    ...(fullTsconfig.config.compilerOptions && fullTsconfig.config.compilerOptions.paths
      ? pathsToModuleNameMapper(fullTsconfig.config.compilerOptions.paths, { prefix: '<rootDir>/' })
      : {}),
  },
  testEnvironment: 'jest-environment-jsdom',
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/data/', '<rootDir>/dist/'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/data/', '<rootDir>/dist/', '<rootDir>/node_modules/'],
  transformIgnorePatterns: [],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
      },
    ],
    '\\.tsx$': [
      'ts-jest',
      {
        useESM: true,
        isolatedModules: true,
      },
    ],
    '\\.(html|xml|txt)$': '@glen/jest-raw-loader',
  },
  globals: {
    fetch,
  },
};

// Used to specify the default cache directory in our CI/CD environment
if (typeof process.env.JEST_CACHE_PATH === 'string') {
  customJestConfig.cacheDirectory = process.env.JEST_CACHE_PATH;
}

const asyncConfig = createJestConfig(customJestConfig);

const defaultExport = async () => {
  const config = await asyncConfig();

  config.moduleNameMapper = {
    '^.+\\.(email|storybook)\\.scss$': '<rootDir>/src/fixtures/rawStyleMock.ts',
    ...config.moduleNameMapper,
  };

  return config;
};

export default defaultExport;
