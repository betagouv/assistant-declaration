import { getBossClientInstance } from '@ad/src/server/queueing/client';

// import { todoActionTopic } from '@ad/src/server/queueing/workers/todo';

export async function scheduleCronTasks() {
  const bossClient = await getBossClientInstance();

  // Schedule tasks
  // await bossClient.schedule(todoActionTopic, `0 19 * * 0,3`, undefined, { tz: 'Europe/Paris' }); // Each sunday and wednesday at 7pm since the entire flow can be a bit long, it will run over night
}
