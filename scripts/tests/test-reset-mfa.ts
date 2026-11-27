/**
 * Test d'intégration du script scripts/reset-mfa.ts
 * - reset complet : MFA désactivée, secrets purgés, log écrit
 * - --unlock : compteurs remis à zéro, MFA toujours activée, log écrit
 *
 * Lancement (depuis le repo) :
 *   DATABASE_URL=postgresql://postgres:changeme@localhost:5432/postgres \
 *   RESET_MFA_LOG_FILE=/tmp/reset-mfa-test.log \
 *   npx tsx /etc/ajean/workspace/test-reset-mfa.ts
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const REPO = '/home/lionel/code/assistant-declaration';
const SCRIPT = resolve(REPO, 'scripts/reset-mfa.js');
const LOG_FILE = process.env.RESET_MFA_LOG_FILE || '/tmp/reset-mfa-test.log';

let failures = 0;

function check(label: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    console.error(`  ❌ ${label}`);
    failures++;
  }
}

async function createUser(prefix: string) {
  const email = `${prefix}-${Date.now()}@test.fr`;
  const user = await prisma.user.create({
    data: { email, firstname: 'Test', lastname: 'Reset' },
  });
  await prisma.userSecrets.create({
    data: {
      userId: user.id,
      passwordHash: 'test-hash',
      totpSecret: 'encrypted-secret',
      mfaFailedAttempts: 0,
    },
  });
  return { user, email };
}

async function runScript(args: string[], env: Record<string, string>) {
  execFileSync('npx', ['tsx', SCRIPT, ...args], {
    cwd: REPO,
    env: { ...process.env, ...env },
    stdio: 'pipe',
  });
}

async function main() {
  rmSync(LOG_FILE, { force: true });

  console.log('== Test 1 : reset complet (perte du second facteur) ==');
  const u1 = await createUser('reset-full');
  await prisma.user.update({
    where: { id: u1.user.id },
    data: { mfaEnabled: true, mfaLastVerifiedAt: new Date(), mfaFailedAttempts: 2, mfaLockedUntil: new Date(Date.now() + 60000) },
  });

  await runScript([u1.email], { DATABASE_URL: process.env.DATABASE_URL!, RESET_MFA_LOG_FILE: LOG_FILE });

  const after1 = await prisma.user.findUnique({ where: { id: u1.user.id }, include: { Secrets: true } });
  check('mfaEnabled = false', after1?.mfaEnabled === false);
  check('mfaLastVerifiedAt = null', after1?.mfaLastVerifiedAt === null);
  check('mfaFailedAttempts (user) = 0', after1?.mfaFailedAttempts === 0);
  check('mfaLockedUntil (user) = null', after1?.mfaLockedUntil === null);
  check('totpSecret = null', after1?.Secrets?.totpSecret === null);
  check('mfaFailedAttempts (secrets) = 0', after1?.Secrets?.mfaFailedAttempts === 0);
  check('mfaLockedUntil (secrets) = null', after1?.Secrets?.mfaLockedUntil === null);
  check('totpLastUsedStep = null', after1?.Secrets?.totpLastUsedStep === null);

  console.log('== Test 2 : déblocage seul (--unlock) ==');
  const u2 = await createUser('unlock');
  await prisma.user.update({
    where: { id: u2.user.id },
    data: { mfaEnabled: true, mfaLastVerifiedAt: new Date(), mfaFailedAttempts: 5, mfaLockedUntil: new Date(Date.now() + 60000) },
  });
  await prisma.userSecrets.update({
    where: { userId: u2.user.id },
    data: { mfaFailedAttempts: 5, mfaLockedUntil: new Date(Date.now() + 60000) },
  });

  await runScript(['--unlock', u2.email], { DATABASE_URL: process.env.DATABASE_URL!, RESET_MFA_LOG_FILE: LOG_FILE });

  const after2 = await prisma.user.findUnique({ where: { id: u2.user.id }, include: { Secrets: true } });
  check('mfaEnabled reste true', after2?.mfaEnabled === true);
  check('mfaLastVerifiedAt conservé', after2?.mfaLastVerifiedAt !== null);
  check('mfaFailedAttempts (user) = 0', after2?.mfaFailedAttempts === 0);
  check('mfaLockedUntil (user) = null', after2?.mfaLockedUntil === null);
  check('totpSecret conservé', after2?.Secrets?.totpSecret === 'encrypted-secret');
  check('mfaFailedAttempts (secrets) = 0', after2?.Secrets?.mfaFailedAttempts === 0);
  check('mfaLockedUntil (secrets) = null', after2?.Secrets?.mfaLockedUntil === null);

  console.log('== Test 3 : journalisation fichier ==');
  check('fichier de log créé', existsSync(LOG_FILE));
  const log = readFileSync(LOG_FILE, 'utf8');
  const lines = log.trim().split('\n');
  check('2 entrées de log (une par action)', lines.length === 2);
  check('log reset : action=reset_mfa + email', lines[0].includes('action=reset_mfa') && lines[0].includes(u1.email));
  check('log reset : admin + timestamp + modifications', lines[0].includes('admin=') && lines[0].includes('modifications='));
  check('log unlock : action=unlock + email', lines[1].includes('action=unlock') && lines[1].includes(u2.email));

  console.log('== Test 4 : utilisateur inexistant ==');
  try {
    await runScript(['nobody@test.fr'], { DATABASE_URL: process.env.DATABASE_URL!, RESET_MFA_LOG_FILE: LOG_FILE });
    check('exit non-nul sur utilisateur inconnu', false);
  } catch (e: any) {
    check('exit non-nul sur utilisateur inconnu', e.status !== 0);
  }
  const log4 = readFileSync(LOG_FILE, 'utf8');
  check('erreur journalisée', log4.includes('action=reset_mfa') && log4.includes('result=error') && log4.includes('nobody@test.fr'));

  // Nettoyage
  await prisma.userSecrets.deleteMany({ where: { userId: { in: [u1.user.id, u2.user.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [u1.user.id, u2.user.id] } } });

  await prisma.$disconnect();
  await pool.end();

  console.log(failures === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${failures} TEST(S) EN ÉCHEC`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
