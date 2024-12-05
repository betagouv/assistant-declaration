import { Command } from '@commander-js/extra-typings';

export const program = new Command();

program.name('assistant-declaration').description('CLI to some deal with "Assistant déclaration" project').version('0.0.0');

const cache = program.command('cache').description('manage cache across commands');

cache
  .command('clear')
  .description('remove local files')
  .action(async () => {
    console.log('cache.clear');
  });
