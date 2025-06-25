import BundleAnalyzer from '@next/bundle-analyzer';
import { SentryBuildOptions, withSentryConfig } from '@sentry/nextjs';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import type { NextConfig } from 'next';
import path from 'path';

import { i18n } from '@ad/next-i18next.config';
import { getCommitSha, getHumanVersion, getTechnicalVersion } from '@ad/src/utils/app-version.js';
import { generateRewrites, localizedRoutes } from '@ad/src/utils/routes/list';
import { getBaseUrl } from '@ad/src/utils/url';
import { applyRawQueryParserOnNextjsCssModule } from '@ad/src/utils/webpack.js';
import { commonPackages } from '@ad/transpilePackages';

const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const mode = process.env.APP_MODE || 'test';

const baseUrl = new URL(getBaseUrl());

const generateNextConfig = async (): Promise<NextConfig> => {
  const appHumanVersion = await getHumanVersion();

  let standardModuleExports: NextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    output: process.env.NEXTJS_BUILD_OUTPUT_MODE ? (process.env.NEXTJS_BUILD_OUTPUT_MODE as 'standalone' | 'export') : 'standalone', // To debug locally the `next start` comment this line (it will avoid trying to mess with the assembling folders logic of standalone mode)
    env: {
      // Those will replace `process.env.*` with hardcoded values (useful when the value is calculated during the build time)
      SENTRY_RELEASE_TAG: appHumanVersion,
    },
    serverRuntimeConfig: {},
    publicRuntimeConfig: {
      appMode: mode,
      appVersion: appHumanVersion,
    },
    i18n: i18n,
    eslint: {
      ignoreDuringBuilds: true, // Skip since already done in a specific step of our CI/CD
    },
    typescript: {
      ignoreBuildErrors: true, // Skip since already done in a specific step of our CI/CD
    },
    transpilePackages: commonPackages,
    sassOptions: {
      silenceDeprecations: ['legacy-js-api'], // Needed until `sass` v2
    },
    outputFileTracingIncludes: {
      '*': ['./src/prisma/migrations/**/*', './src/prisma/schema.prisma', './start-and-wait-to-init.sh'], // Migration and start files are required when doing automatic migration before starting the application
    },
    // It should have been the new `outputFileTracingExcludes` property but it's messing with the Next.js core (ref: https://github.com/vercel/next.js/issues/62331)
    outputFileTracingExcludes: {
      '*': ['./scripts/**/*'], // Note that folders starting with a dot are already ignored after verification
    },
    experimental: {
      optimizePackageImports: [
        '@mui/material',
        '@mui/icons-material',
        '@mui/lab',
        '@mui/x-data-grid',
        '@mui/x-date-pickers',
        'date-fns',
        'react-use',
      ],
      swcPlugins: [['next-superjson-plugin', { excluded: [] }]],
    },
    async redirects() {
      return [
        {
          // Since the landing page has been considered as another page to let the sign in page as primary, we use a redirect to not move all the logic (token flow...)
          source: '/',
          destination: '/dashboard',
          permanent: false, // May impact the SEO not being permanent, but the choice about the root would be too risky
        },
      ];
    },
    async rewrites() {
      return [
        ...generateRewrites('en', localizedRoutes),
        {
          source: '/.well-known/security.txt',
          destination: '/api/security',
        },
        {
          source: '/robots.txt',
          destination: '/api/robots',
        },
      ];
    },
    images: {
      remotePatterns: [
        {
          protocol: baseUrl.protocol.slice(0, -1) as 'http' | 'https',
          hostname: baseUrl.hostname,
        },
        {
          protocol: 'https',
          hostname: 'via.placeholder.com',
        },
      ],
    },
    webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
      // Expose all DSFR fonts as static at the root
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: path.dirname(require.resolve('@gouvfr/dsfr/dist/fonts/Marianne-Bold.woff2')),
              to: path.resolve(__dirname, './public/assets/fonts/'),
            },
            {
              from: path.dirname(require.resolve('@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff2')),
              to: path.resolve(__dirname, './public/assets/fonts/'),
            },
            {
              from: require.resolve('./src/assets/fonts/index.css'),
              to: path.resolve(__dirname, './public/assets/fonts/'),
            },
          ],
        })
      );

      // Inject a style loader when we want to use `foo.scss?raw` for backend processing (like emails)
      applyRawQueryParserOnNextjsCssModule(config.module.rules);

      config.module.rules.push({
        test: /\.woff2$/,
        type: 'asset/resource',
      });

      config.module.rules.push({
        test: /\.(txt|html)$/i,
        use: 'raw-loader',
      });

      return config;
    },
    poweredByHeader: false,
    generateBuildId: async () => {
      return await getTechnicalVersion();
    },
  };

  const uploadToSentry = process.env.SENTRY_RELEASE_UPLOAD === 'true' && process.env.NODE_ENV === 'production';

  const sentryWebpackPluginOptions: SentryBuildOptions = {
    unstable_sentryWebpackPluginOptions: {
      disable: !uploadToSentry,
    },
    debug: false,
    silent: false,
    release: {
      name: appHumanVersion,
      setCommits: {
        // TODO: get error: caused by: sentry reported an error: You do not have permission to perform this action. (http status: 403)
        // Possible ref: https://github.com/getsentry/sentry-cli/issues/1388#issuecomment-1306137835
        // Note: not able to bind our repository to our on-premise Sentry as specified in the article... leaving it manual for now (no commit details...)
        auto: false,
        repo: 'betagouv/assistant-declaration',
        commit: getCommitSha(),
        // auto: true,
      },
      deploy: {
        env: mode,
      },
    },
    hideSourceMaps: mode === 'prod', // Do not serve sourcemaps in `prod`
    // tunnelRoute: '/monitoring', // Helpful to avoid adblockers, but requires Sentry SaaS
    // disableServerWebpackPlugin: true, // TODO
    // disableClientWebpackPlugin: true, // TODO
    disableLogger: false,
  };

  return withBundleAnalyzer(withSentryConfig(standardModuleExports, sentryWebpackPluginOptions));
};

export default generateNextConfig;
