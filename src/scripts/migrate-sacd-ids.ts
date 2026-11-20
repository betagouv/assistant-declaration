import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface Mapping {
  oldId: string;
  newId: string;
}

interface MigrationResult extends Mapping {
  status: 'updated' | 'error';
  message?: string;
}

function validateOldId(id: string): boolean {
  return /^\d{6}$/.test(id);
}

function validateNewId(id: string): boolean {
  return /^[0-9a-fA-F]{32}$/.test(id);
}

async function readCorrespondenceFile(filePath: string): Promise<Mapping[]> {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const content = fs.readFileSync(absolutePath, 'utf-8').trim();
  const lines = content.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

  if (headers.length !== 2 || headers[0] !== 'oldid' || headers[1] !== 'newid') {
    throw new Error('CSV must have two columns: oldId,newId');
  }

  const entries: Mapping[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [oldId, newId] = line.split(',').map(x => x.trim());
    if (!oldId || !newId) {
      throw new Error(`Invalid CSV row ${i}: ${line}`);
    }
    entries.push({ oldId, newId });
  }

  // Validate all entries
  for (const entry of entries) {
    if (!validateOldId(entry.oldId)) {
      throw new Error(`Invalid old ID: ${entry.oldId}`);
    }
    if (!validateNewId(entry.newId)) {
      throw new Error(`Invalid new ID: ${entry.newId}`);
    }
  }

  return entries;
}

function hasDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

async function showSampleRecords(label: string) {
  console.log(`\n=== ${label} ===`);

  if (!hasDatabaseConfigured()) {
    console.log('No DATABASE_URL set - skipping sample records');
    return;
  }

  try {
    // Import the shared prisma instance from the project
    const { prisma } = await import('../prisma/client.ts');

    const records = await prisma.organization.findMany({
      where: { sacdId: { not: null } },
      select: { name: true, sacdId: true },
      take: 5,
      orderBy: { sacdId: 'asc' },
    });

    if (records.length === 0) {
      console.log('No records with sacdId found');
      return;
    }

    console.log('name | sacdId');
    console.log('-----|-------');
    for (const record of records) {
      console.log(`${record.name} | ${record.sacdId}`);
    }
  } catch (error: any) {
    console.log(`Could not query database: ${error.message}`);
  }
}

async function migrateSacdIds(mappings: Mapping[]): Promise<MigrationResult[]> {
  const usedNewIds = new Set<string>();
  const results: MigrationResult[] = [];

  if (!hasDatabaseConfigured()) {
    // Dry-run mode: simulate updates without touching database
    for (const mapping of mappings) {
      if (usedNewIds.has(mapping.newId)) {
        results.push({
          ...mapping,
          status: 'error',
          message: `duplicate new ID: ${mapping.newId}`,
        });
        continue;
      }
      usedNewIds.add(mapping.newId);
      results.push({
        ...mapping,
        status: 'updated',
      });
    }
    return results;
  }

  // Live mode: actually update the database
  try {
    const { prisma } = await import('../prisma/client.ts');

    for (const mapping of mappings) {
      if (usedNewIds.has(mapping.newId)) {
        results.push({
          ...mapping,
          status: 'error',
          message: `duplicate new ID: ${mapping.newId}`,
        });
        continue;
      }

      usedNewIds.add(mapping.newId);

      try {
        const result = await prisma.organization.updateMany({
          where: { sacdId: mapping.oldId },
          data: { sacdId: mapping.newId },
        });

        if (result.count === 0) {
          results.push({
            ...mapping,
            status: 'error',
            message: `old ID not found: ${mapping.oldId}`,
          });
        } else {
          results.push({
            ...mapping,
            status: 'updated',
          });
        }
      } catch (error: any) {
        results.push({
          ...mapping,
          status: 'error',
          message: `database error: ${error.message}`,
        });
      }
    }
  } catch (error: any) {
    throw new Error(`Failed to connect to database: ${error.message}`);
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node migrate-sacd-ids.js <correspondence-file>');
    process.exit(1);
  }

  const filePath = args[0];

  console.log(`Reading correspondence file: ${filePath}`);

  const mappings = await readCorrespondenceFile(filePath);
  console.log(`Found ${mappings.length} mappings to migrate`);

  if (!hasDatabaseConfigured()) {
    console.log('No DATABASE_URL set - running in dry-run mode');
  }

  // Show sample records before migration
  await showSampleRecords('BEFORE MIGRATION');

  // Run migration
  const results = await migrateSacdIds(mappings);

  // Show sample records after migration
  await showSampleRecords('AFTER MIGRATION');

  // Summary
  const updated = results.filter((r) => r.status === 'updated').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log(`\nMigration complete: ${updated} updated, ${errors} errors`);

  if (errors > 0) {
    console.log('\nErrors:');
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => console.log(`  ${r.oldId} -> ${r.newId}: ${r.message}`));
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error: any) => {
    console.error(`Migration failed: ${error.message}`);
    process.exit(1);
  });
}