import { generate } from '@graphql-codegen/cli';

generate(
  {
    schema: {
      'https://partners-endpoint.dice.fm/graphql': {
        headers: {
          Authorization: `Bearer ${process.env.TEST_DICE_SECRET_KEY || 'not_defined'}`,
        },
      },
    },
    documents: 'src/client/dice/**/*.gql',
    generates: {
      'src/client/dice/generated/graphql.ts': {
        plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
        config: {
          strictScalars: true,
          avoidOptionals: true,
          scalars: {
            Datetime: 'string',
          },
        },
      },
    },
  },
  true
).then(() => {
  console.log('dice api types generated');
});
