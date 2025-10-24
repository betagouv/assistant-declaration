import { getBossClientInstance } from '@ad/src/server/queueing/client';
import { cleanPendingUploadsTopic } from '@ad/src/server/queueing/workers/clean-pending-uploads';

export async function scheduleCronTasks() {
  const bossClient = await getBossClientInstance();

  // Schedule tasks
  await bossClient.schedule(cleanPendingUploadsTopic, `0 3 * * *`, undefined, { tz: 'Europe/Paris' }); // At night to save performance
}
