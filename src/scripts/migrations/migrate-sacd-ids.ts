/**
 * Migration des identifiants SACD
 * =================================
 *
 * Ce script permet de migrer les identifiants SACD des organisations
 * à partir d'un fichier CSV de correspondance.
 *
 * USAGE :
 *   Mode export : npx tsx src/scripts/migrations/migrate-sacd-ids.ts
 *     -> Exporte tous les sacdId actuels (avec le nom) vers sacd-ids-export.csv
 *     -> Nécessite DATABASE_URL (ou .env.test), aucune écriture en base
 *
 *   Mode migration : npx tsx src/scripts/migrate-sacd-ids.ts <fichier.csv>
 *     -> Met à jour les sacdId selon le fichier de correspondance
 *     -> Silencieux, sauf un comparatif final des 5 premiers enregistrements
 *
 * BASE DE DONNÉES :
 *   - Utilise DATABASE_URL si définie
 *   - Sinon, charge .env.test à la racine du projet (avertissement sur stderr)
 *   - Sans DATABASE_URL ni .env.test : dry-run (simulation, aucune écriture,
 *     aucun affichage ; les erreurs sont signalées par le code de sortie)
 *
 * FORMAT DU FICHIER CSV :
 *   oldId,newId
 *   123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
 *   654321,d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1
 *
 *   oldId : ancien identifiant SACD (6 chiffres)
 *   newId : nouvel identifiant SACD (32 caractères hexadécimaux)
 *
 * VALIDATION :
 *   - oldId : exactement 6 chiffres, sans doublon dans le fichier
 *   - newId : exactement 32 caractères hexadécimaux, sans doublon dans le fichier
 *
 * COMPORTEMENT (mode migration) :
 *   - Capture les 5 premiers enregistrements avant migration, puis les relit
 *     par id après migration et affiche un comparatif avant -> actuel
 *   - Détecte les doublons de nouveaux IDs
 *   - Gère les anciens IDs inexistants
 *   - Retourne un code de sortie 1 en cas d'erreurs
 */
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use existing environment variables if available, otherwise load from .env.test
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });
  if (process.env.DATABASE_URL) {
    console.error('Warning: DATABASE_URL loaded from .env.test — updates will target this database');
  }
}

interface Mapping {
  oldId: string;
  newId: string;
}

interface MigrationResult extends Mapping {
  status: 'updated' | 'error';
  message?: string;
}

// Adapte le type de `id` si ta clé primaire est un Int (ou autre)
interface SampleRecord {
  id: string;
  name: string;
  sacdId: string | null;
}

const EXPORT_FILENAME = 'sacd-ids-export.csv';

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

  // Strip UTF-8 BOM (fichiers édités dans Excel) avant parsing
  const content = fs
    .readFileSync(absolutePath, 'utf-8')
    .replace(/^\uFEFF/, '')
    .trim();
  const lines = content.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must have header and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  if (headers.length !== 2 || headers[0] !== 'oldid' || headers[1] !== 'newid') {
    throw new Error('CSV must have two columns: oldId,newId');
  }

  const entries: Mapping[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [oldId, newId] = line.split(',').map((x) => x.trim());
    if (!oldId || !newId) {
      throw new Error(`Invalid CSV row ${i}: ${line}`);
    }
    entries.push({ oldId, newId });
  }

  // Validate all entries
  const seenOldIds = new Set<string>();
  for (const entry of entries) {
    if (!validateOldId(entry.oldId)) {
      throw new Error(`Invalid old ID: ${entry.oldId}`);
    }
    if (!validateNewId(entry.newId)) {
      throw new Error(`Invalid new ID: ${entry.newId}`);
    }
    if (seenOldIds.has(entry.oldId)) {
      throw new Error(`Duplicate old ID in CSV: ${entry.oldId}`);
    }
    seenOldIds.add(entry.oldId);
  }

  return entries;
}

function hasDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Exporte les sacdId actuels vers un fichier CSV (lecture seule, aucune écriture en base)
async function exportCurrentSacdIds(): Promise<void> {
  if (!hasDatabaseConfigured()) {
    throw new Error('DATABASE_URL is required to export (set it or provide .env.test)');
  }

  const { prisma } = await import('../../prisma/client.ts');

  const records = await prisma.organization.findMany({
    where: { sacdId: { not: null } },
    select: { name: true, sacdId: true },
    orderBy: { sacdId: 'asc' },
  });

  const lines = ['oldId,name', ...records.map((r) => `${r.sacdId ?? ''},${csvEscape(r.name)}`)];

  const outputPath = path.resolve(EXPORT_FILENAME);
  fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf-8');

  console.log(`Exported ${records.length} records to ${outputPath}`);
}

// Capture les 5 premières entrées AVANT migration (avec leur id pour les retrouver après)
async function fetchSampleRecords(): Promise<SampleRecord[]> {
  if (!hasDatabaseConfigured()) return [];

  const { prisma } = await import('../../prisma/client.ts');

  const records = await prisma.organization.findMany({
    where: { sacdId: { not: null } },
    select: { id: true, name: true, sacdId: true },
    take: 5,
    orderBy: { sacdId: 'asc' },
  });

  return records as SampleRecord[];
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
    const { prisma } = await import('../../prisma/client.ts');

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

// Unique log de la migration : relit les 5 échantillons par id (l'ordre a pu changer)
async function printSampleDiff(before: SampleRecord[]): Promise<void> {
  if (before.length === 0) return;

  const { prisma } = await import('../../prisma/client.ts');

  const currentRecords = (await prisma.organization.findMany({
    where: { id: { in: before.map((r) => r.id) } },
    select: { id: true, name: true, sacdId: true },
  })) as SampleRecord[];

  const currentById = new Map(currentRecords.map((r) => [r.id, r] as const));

  const lines: string[] = ['name | old sacdId | current sacdId', '-----|------------|---------------'];

  for (const prev of before) {
    const current = currentById.get(prev.id);
    if (!current) {
      lines.push(`${prev.name} | ${prev.sacdId} | (record not found)`);
      continue;
    }
    const suffix = current.sacdId === prev.sacdId ? ' (unchanged)' : '';
    lines.push(`${prev.name} | ${prev.sacdId} | ${current.sacdId}${suffix}`);
  }

  console.log(`\n${lines.join('\n')}`);
}

async function main() {
  const args = process.argv.slice(2);

  // Pas de fichier CSV en argument -> export uniquement, jamais de migration
  if (args.length === 0) {
    await exportCurrentSacdIds();
    return;
  }

  const mappings = await readCorrespondenceFile(args[0]);
  const sampleBefore = await fetchSampleRecords();
  const results = await migrateSacdIds(mappings);

  await printSampleDiff(sampleBefore);

  const errors = results.filter((r) => r.status === 'error').length;
  if (errors > 0) {
    process.exit(1);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error: any) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
