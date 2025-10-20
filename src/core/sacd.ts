import { parse } from 'csv-parse';
import fsSync from 'fs';
import path from 'path';

import { CsvSacdAgencySchema } from '@ad/src/models/entities/csv/sacd';
import { prisma } from '@ad/src/prisma';
import { formatDiffResultLog, getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';

const __root_dirname = process.cwd();

const localCsvPath = path.resolve(__root_dirname, './data/sacd-agencies.csv');

interface LiteAgency {
  email: string;
  matchingPostalCodesPrefixes: string[];
}

export async function syncSacdAgencies() {
  console.log(`starting the synchronization of sacd agencies within the platform, it may take up to 2 minutes`);

  // Below we sort postal codes to not trigger changes if not ordered the same way
  const localLiteAgencies = new Map<string, LiteAgency>();
  const existingLiteAgencies: typeof localLiteAgencies = new Map();

  const parser = fsSync.createReadStream(localCsvPath, 'utf-8').pipe(
    parse({
      columns: true, // Each record as object instead of array
      delimiter: ',',
      skip_empty_lines: true,
    })
  );

  for await (const record of parser) {
    const csvAgency = CsvSacdAgencySchema.parse(record);

    const localLiteAgency = localLiteAgencies.get(csvAgency.mail);

    if (localLiteAgency) {
      localLiteAgency.matchingPostalCodesPrefixes.push(csvAgency.Département);
    } else {
      localLiteAgencies.set(csvAgency.mail, {
        email: csvAgency.mail,
        matchingPostalCodesPrefixes: [csvAgency.Département],
      });
    }
  }

  // Once the ones from the CSV are retrieved, make sure to order arrays for comparaison
  for (const [_, localLiteAgency] of localLiteAgencies) {
    localLiteAgency.matchingPostalCodesPrefixes = localLiteAgency.matchingPostalCodesPrefixes.sort();
  }

  const existingAgencies = await prisma.sacdAgency.findMany({
    select: {
      id: true,
      email: true,
      matchingFrenchPostalCodesPrefixes: true,
    },
  });

  for (const existingAgency of existingAgencies) {
    existingLiteAgencies.set(existingAgency.email, {
      email: existingAgency.email,
      matchingPostalCodesPrefixes: existingAgency.matchingFrenchPostalCodesPrefixes.sort(),
    });
  }

  const agenciesDiffResult = getDiff(existingLiteAgencies, localLiteAgencies);
  const sortedAgenciesDiffResult = sortDiffWithKeys(agenciesDiffResult);

  console.log(`synchronizing sacd agencies into the platform (${formatDiffResultLog(agenciesDiffResult)})`);

  if (sortedAgenciesDiffResult.added.length > 0) {
    await prisma.sacdAgency.createMany({
      data: sortedAgenciesDiffResult.added.map((addedAgency) => ({
        email: addedAgency.model.email,
        matchingFrenchPostalCodesPrefixes: addedAgency.model.matchingPostalCodesPrefixes,
      })),
      skipDuplicates: true,
    });
  }

  if (sortedAgenciesDiffResult.updated.length > 0) {
    for (const updatedAgency of sortedAgenciesDiffResult.updated) {
      await prisma.sacdAgency.update({
        where: {
          email: updatedAgency.model.email,
        },
        data: {
          matchingFrenchPostalCodesPrefixes: updatedAgency.model.matchingPostalCodesPrefixes,
        },
      });
    }
  }

  if (sortedAgenciesDiffResult.removed.length > 0) {
    await prisma.sacdAgency.deleteMany({
      where: {
        email: {
          in: sortedAgenciesDiffResult.removed.map((removedAgency) => removedAgency.model.email),
        },
      },
    });
  }
}
