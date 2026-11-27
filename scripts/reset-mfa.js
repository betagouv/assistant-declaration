#!/usr/bin/env node
/**
 * Script de gestion MFA d'un utilisateur.
 *
 * Deux modes :
 * - reset complet (défaut) : l'utilisateur a perdu son second facteur.
 *   Désactive la MFA (mfaEnabled=false, totpSecret=null, compteurs à zéro).
 *   L'utilisateur devra se ré-enrôler.
 * - --unlock : le compte est simplement verrouillé (trop d'échecs).
 *   Remet uniquement les compteurs d'échecs à zéro, sans toucher à la MFA.
 *
 * Utilise Prisma avec la même configuration que l'application
 * (adaptateur pg, pool de connexions).
 *
 * Toutes les actions sont journalisées dans un fichier de log (append)
 * : qui (admin), quand (timestamp), quel compte, quoi (modifications).
 *
 * Usage :
 *   DATABASE_URL=postgres://... node scripts/reset-mfa.js <email>            # reset complet
 *   DATABASE_URL=postgres://... node scripts/reset-mfa.js --unlock <email>   # déblocage seul
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

// Même configuration que src/prisma/client.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ['error'],
});

const LOG_FILE = process.env.RESET_MFA_LOG_FILE || resolve(process.cwd(), 'logs/reset-mfa.log');

function logToFile(line) {
  appendFileSync(LOG_FILE, line + '\n', 'utf8');
}

function admin() {
  return process.env.ADMIN_EMAIL || process.env.USER || 'unknown';
}

async function resetMfa(email) {
  console.log(`[reset-mfa] Recherche de l'utilisateur : ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { Secrets: true },
  });

  if (!user) {
    const msg = `Utilisateur non trouvé : ${email}`;
    console.error(`[reset-mfa] ${msg}`);
    logToFile(`[${new Date().toISOString()}] admin=${admin()} action=reset_mfa email=${email} result=error reason=user_not_found`);
    process.exit(1);
  }

  console.log(`[reset-mfa] Utilisateur trouvé : ${user.id} (${user.firstname} ${user.lastname})`);

  // Mettre à jour les champs MFA sur l'utilisateur
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaEnabled: false,
      mfaLastVerifiedAt: null,
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    },
  });

  console.log(`[reset-mfa] Champs MFA utilisateur réinitialisés`);

  // Mettre à jour les secrets TOTP dans UserSecrets
  if (user.Secrets) {
    await prisma.userSecrets.update({
      where: { id: user.Secrets.id },
      data: {
        totpSecret: null,
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        totpLastUsedStep: null,
      },
    });

    console.log(`[reset-mfa] Secrets TOTP réinitialisés`);
  } else {
    console.log(`[reset-mfa] Aucun UserSecrets trouvé pour cet utilisateur`);
  }

  logToFile(
    `[${new Date().toISOString()}] admin=${admin()} action=reset_mfa email=${email} userId=${user.id} ` +
      `result=success modifications={mfaEnabled:false, mfaLastVerifiedAt:null, mfaFailedAttempts:0, mfaLockedUntil:null, totpSecret:null, totpLastUsedStep:null}`
  );

  console.log(`[reset-mfa] Réinitialisation MFA terminée pour ${email} (journalisée dans ${LOG_FILE})`);
}

async function unlockUser(email) {
  console.log(`[reset-mfa] Recherche de l'utilisateur : ${email}`);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { Secrets: true },
  });

  if (!user) {
    const msg = `Utilisateur non trouvé : ${email}`;
    console.error(`[reset-mfa] ${msg}`);
    logToFile(`[${new Date().toISOString()}] admin=${admin()} action=unlock email=${email} result=error reason=user_not_found`);
    process.exit(1);
  }

  console.log(`[reset-mfa] Utilisateur trouvé : ${user.id} (${user.firstname} ${user.lastname})`);

  // Remettre uniquement les compteurs à zéro, sans toucher à la MFA
  await prisma.user.update({
    where: { id: user.id },
    data: {
      mfaFailedAttempts: 0,
      mfaLockedUntil: null,
    },
  });

  if (user.Secrets) {
    await prisma.userSecrets.update({
      where: { id: user.Secrets.id },
      data: {
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
      },
    });
  }

  logToFile(
    `[${new Date().toISOString()}] admin=${admin()} action=unlock email=${email} userId=${user.id} ` +
      `result=success modifications={mfaFailedAttempts:0, mfaLockedUntil:null}`
  );

  console.log(`[reset-mfa] Déblocage terminé pour ${email} (journalisé dans ${LOG_FILE})`);
}

async function main() {
  const args = process.argv.slice(2);
  const unlock = args[0] === '--unlock';
  const email = unlock ? args[1] : args[0];

  if (!email) {
    console.error('Usage :');
    console.error('  DATABASE_URL=postgres://... node scripts/reset-mfa.js <email>            # reset complet');
    console.error('  DATABASE_URL=postgres://... node scripts/reset-mfa.js --unlock <email>   # déblocage seul');
    process.exit(1);
  }

  try {
    if (unlock) {
      await unlockUser(email);
    } else {
      await resetMfa(email);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
