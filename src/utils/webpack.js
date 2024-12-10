export function applyRawQueryParserOnCssModule(moduleRules) {
  let scssRuleFound = false;
  for (const ruleIndex of moduleRules) {
    const originalRule = moduleRules[ruleIndex];

    // If for `sass` we add our additional one (they cannot colocate on the same level because they would be played both... resulting in CSS parsing errors)
    if (originalRule.test && originalRule.test.test('.scss')) {
      scssRuleFound = true;

      moduleRules[ruleIndex] = {
        test: originalRule.test,
        oneOf: [
          {
            resourceQuery: /raw/, // foo.scss?raw
            type: 'asset/source',
            use: [
              {
                loader: 'postcss-loader',
                options: {
                  postcssOptions: {
                    // In our case getting raw style in to inject it in emails, we want to make sure it's minified to avoid comments and so on
                    plugins: [cssnano({ preset: 'default' })],
                  },
                },
              },
              'resolve-url-loader',
              'sass-loader',
            ],
          },
          {
            use: originalRule.use,
          },
        ],
      };
    }
  }

  if (!scssRuleFound) {
    throw new Error('our custom SCSS rule should have been added, make sure the project manage SCSS by default first');
  }
}
