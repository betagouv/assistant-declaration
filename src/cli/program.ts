import { Command } from '@commander-js/extra-typings';
import { addMonths, set } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

import { syncSacdAgencies } from '@ad/src/core/sacd';
import { syncSacemAgencies } from '@ad/src/core/sacem';
import { exportSibilStatistics, generateSibilDeclarationsExportJsonSchema } from '@ad/src/core/sibil';

export const program = new Command();

program.name('assistant-declaration').description('CLI to some deal with "Assistant déclaration" project').version('0.0.0');

const sacd = program.command('sacd').description('manage sacd stuff');
const sacdAgency = sacd.command('agency').description('manage sacd agencies');
const sacem = program.command('sacem').description('manage sacem stuff');
const sacemAgency = sacem.command('agency').description('manage sacem agencies');
const sibil = program.command('sibil').description('manage sibil stuff');
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

sibil
  .command('export')
  .description('export sibil statistics')
  .action(async () => {
    const fromDate = fromZonedTime(set(new Date(0), { year: 2025, month: 9, date: 1 }), 'Europe/Paris');
    const toDate = addMonths(fromDate, 3); // Export logic is by quarter

    await exportSibilStatistics({
      fromDate: fromDate,
      toDate: toDate,
    });
  });

sibil
  .command('schema')
  .description('generate sibil export json schema')
  .action(async () => {
    await generateSibilDeclarationsExportJsonSchema();
  });

cache
  .command('clear')
  .description('remove local files')
  .action(async () => {
    console.log('cache.clear');
  });
