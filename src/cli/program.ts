import { Command } from '@commander-js/extra-typings';

import { syncSacdAgencies } from '@ad/src/core/sacd';
import { syncSacemAgencies } from '@ad/src/core/sacem';

export const program = new Command();

program.name('assistant-declaration').description('CLI to some deal with "Assistant déclaration" project').version('0.0.0');

const sacd = program.command('sacd').description('manage sacd stuff');
const sacdAgency = sacd.command('agency').description('manage sacd agencies');
const sacem = program.command('sacem').description('manage sacem stuff');
const sacemAgency = sacem.command('agency').description('manage sacem agencies');
const cache = program.command('cache').description('manage cache across commands');

sacdAgency
  .command('sync')
  .description('synchronize sacd agencies into the platform')
  .action(async () => {
    await syncSacdAgencies();
  });

sacemAgency
  .command('sync')
  .description('synchronize sacem agencies into the platform')
  .action(async () => {
    await syncSacemAgencies();
  });

cache
  .command('clear')
  .description('remove local files')
  .action(async () => {
    console.log('cache.clear');
  });
