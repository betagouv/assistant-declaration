/**
 * @jest-environment node
 */
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, 'migrate-sacd-ids.ts');

describe('Script de migration des identifiants SACD', () => {
  describe('Validation des anciens IDs', () => {
    it('accepte un ancien ID valide à 6 chiffres', async () => {
      const filePath = '/tmp/test-migration.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Migration complete');
      expect(result.output).toContain('1 updated');

      fs.unlinkSync(filePath);
    });

    it('rejette un ancien ID trop court', async () => {
      const filePath = '/tmp/test-migration-short.csv';
      const content = 'oldId,newId\n12345,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid old ID');

      fs.unlinkSync(filePath);
    });

    it('rejette un ancien ID trop long', async () => {
      const filePath = '/tmp/test-migration-long.csv';
      const content = 'oldId,newId\n1234567,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid old ID');

      fs.unlinkSync(filePath);
    });

    it('rejette un ancien ID non numérique', async () => {
      const filePath = '/tmp/test-migration-alpha.csv';
      const content = 'oldId,newId\n12345a,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid old ID');

      fs.unlinkSync(filePath);
    });
  });

  describe('Validation des nouveaux IDs', () => {
    it('accepte un nouveau ID hexadécimal valide à 32 caractères', async () => {
      const filePath = '/tmp/test-migration-hex.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Migration complete');

      fs.unlinkSync(filePath);
    });

    it('accepte un nouveau ID hexadécimal en majuscules', async () => {
      const filePath = '/tmp/test-migration-hex-upper.csv';
      const content = 'oldId,newId\n123456,A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Migration complete');

      fs.unlinkSync(filePath);
    });

    it('rejette un nouveau ID trop court', async () => {
      const filePath = '/tmp/test-migration-hex-short.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid new ID');

      fs.unlinkSync(filePath);
    });

    it('rejette un nouveau ID trop long', async () => {
      const filePath = '/tmp/test-migration-hex-long.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid new ID');

      fs.unlinkSync(filePath);
    });

    it('rejette un nouveau ID non hexadécimal', async () => {
      const filePath = '/tmp/test-migration-hex-invalid.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3g4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Invalid new ID');

      fs.unlinkSync(filePath);
    });
  });

  describe('Lecture du fichier de correspondance', () => {
    it('lit et parse un fichier CSV valide', async () => {
      const filePath = '/tmp/test-migration-read.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n654321,d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Found 2 mappings to migrate');
      expect(result.output).toContain('2 updated');

      fs.unlinkSync(filePath);
    });

    it('signale une erreur pour un fichier inexistant', async () => {
      const result = await runScript('/tmp/non-existent-file.csv');
      expect(result.output).toContain('File not found');
    });

    it('signale une erreur pour un CSV invalide', async () => {
      const filePath = '/tmp/test-migration-invalid.csv';
      fs.writeFileSync(filePath, 'not valid csv');

      const result = await runScript(filePath);
      expect(result.output).toContain('CSV must have header and at least one data row');

      fs.unlinkSync(filePath);
    });
  });

  describe('Migration des identifiants', () => {
    it('met à jour les IDs et retourne les résultats', async () => {
      const filePath = '/tmp/test-migration-update.csv';
      const content = 'oldId,newId\n123456,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n654321,d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Migration complete');
      expect(result.output).toContain('2 updated');
      expect(result.output).toContain('0 errors');

      fs.unlinkSync(filePath);
    });

    it('gère les IDs anciennes inexistantes', async () => {
      const filePath = '/tmp/test-migration-notfound.csv';
      const content = 'oldId,newId\n999999,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('Migration complete');

      fs.unlinkSync(filePath);
    });

    it('gère les doublons de nouveaux IDs', async () => {
      const filePath = '/tmp/test-migration-duplicate.csv';
      const content = 'oldId,newId\n111111,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n222222,a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4';
      fs.writeFileSync(filePath, content);

      const result = await runScript(filePath);
      expect(result.output).toContain('1 updated');
      expect(result.output).toContain('1 errors');
      expect(result.output).toContain('duplicate');

      fs.unlinkSync(filePath);
    });
  });
});

function runScript(filePath) {
  return new Promise((resolve) => {
    const command = `cd ${__dirname} && DATABASE_URL= npx ts-node migrate-sacd-ids.ts ${filePath}`;
    exec(command, (error, stdout, stderr) => {
      resolve({
        output: stdout + stderr,
        exitCode: error ? error.code : 0,
      });
    });
  });
}