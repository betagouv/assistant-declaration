import { parse } from 'csv-parse';
import fsSync from 'fs';
import path from 'path';

import { CsvSacemAgencySchema } from '@ad/src/models/entities/csv/sacem';
import { prisma } from '@ad/src/prisma';
import { formatDiffResultLog, getDiff, sortDiffWithKeys } from '@ad/src/utils/comparaison';

const __root_dirname = process.cwd();

const localCsvPath = path.resolve(__root_dirname, './data/sacem-agencies.csv');

interface LiteAgency {
  email: string;
  matchingPostalCodes: string[];
}

export async function syncSacemAgencies() {
  console.log(`starting the synchronization of sacem agencies within the platform, it may take up to 2 minutes`);

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
    const csvAgency = CsvSacemAgencySchema.parse(record);

    const localLiteAgency = localLiteAgencies.get(csvAgency.Mail);

    if (localLiteAgency) {
      localLiteAgency.matchingPostalCodes.push(csvAgency.CP);
    } else {
      localLiteAgencies.set(csvAgency.Mail, {
        email: csvAgency.Mail,
        matchingPostalCodes: [csvAgency.CP],
      });
    }
  }

  // Once the ones from the CSV are retrieved, make sure to order arrays for comparaison
  for (const [_, localLiteAgency] of localLiteAgencies) {
    localLiteAgency.matchingPostalCodes = localLiteAgency.matchingPostalCodes.sort();
  }

  const existingAgencies = await prisma.sacemAgency.findMany({
    select: {
      id: true,
      email: true,
      matchingFrenchPostalCodes: true,
    },
  });

  for (const existingAgency of existingAgencies) {
    existingLiteAgencies.set(existingAgency.email, {
      email: existingAgency.email,
      matchingPostalCodes: existingAgency.matchingFrenchPostalCodes.sort(),
    });
  }

  const agenciesDiffResult = getDiff(existingLiteAgencies, localLiteAgencies);
  const sortedAgenciesDiffResult = sortDiffWithKeys(agenciesDiffResult);

  console.log(`synchronizing sacem agencies into the platform (${formatDiffResultLog(agenciesDiffResult)})`);

  if (sortedAgenciesDiffResult.added.length > 0) {
    await prisma.sacemAgency.createMany({
      data: sortedAgenciesDiffResult.added.map((addedAgency) => ({
        email: addedAgency.model.email,
        matchingFrenchPostalCodes: addedAgency.model.matchingPostalCodes,
      })),
      skipDuplicates: true,
    });
  }

  if (sortedAgenciesDiffResult.updated.length > 0) {
    for (const updatedAgency of sortedAgenciesDiffResult.updated) {
      await prisma.sacemAgency.update({
        where: {
          email: updatedAgency.model.email,
        },
        data: {
          matchingFrenchPostalCodes: updatedAgency.model.matchingPostalCodes,
        },
      });
    }
  }

  if (sortedAgenciesDiffResult.removed.length > 0) {
    await prisma.sacemAgency.deleteMany({
      where: {
        email: {
          in: sortedAgenciesDiffResult.removed.map((removedAgency) => removedAgency.model.email),
        },
      },
    });
  }
}
