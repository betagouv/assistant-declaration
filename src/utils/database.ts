import path from 'path';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import type { StartedGenericContainer } from 'testcontainers/build/generic-container/started-generic-container';

import { bindContainerLogs, defaultEnvironment, formatContainerNameWithSuffix } from '@ad/src/utils/testcontainers';

const __root_dirname = process.cwd();

export interface PostgresContainer {
  container: StartedGenericContainer;
  url: string;
}

export async function setupPostgres(): Promise<PostgresContainer> {
  const dummyUser = 'postgres';
  const dummyPassword = 'postgres';
  const dummyDatabase = 'postgres';

  const isPipelineWorker = process.env.CI === 'true';
  if (isPipelineWorker) {
    process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  }

  const composeFilePath = path.resolve(__root_dirname, './');
  const composeFile = 'docker-compose.yaml';
  const serviceName = 'postgres';
  const containerName = formatContainerNameWithSuffix('ad_postgres_container');

  const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withEnvironment({
      ...defaultEnvironment,
      DOCKER_COMPOSE_POSTGRES_PORT_BINDING: '5432', // To use a random port from the host
      POSTGRES_USER: dummyUser,
      POSTGRES_PASSWORD: dummyPassword,
      POSTGRES_DB: dummyDatabase,
    })
    .withWaitStrategy(serviceName, Wait.forHealthCheck())
    .up([serviceName]);

  const container = environment.getContainer(containerName);

  bindContainerLogs(container, {
    enabled: false,
  });

  const ip = container.getHost();
  const mappedPort = container.getMappedPort(5432);

  const url = `postgresql://${dummyUser}:${dummyPassword}@${ip}:${mappedPort}/${dummyDatabase}`;

  return {
    container,
    url,
  };
}
