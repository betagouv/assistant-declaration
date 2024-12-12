import path from 'path';
import { DockerComposeEnvironment, Wait } from 'testcontainers';
import { StartedGenericContainer } from 'testcontainers/build/generic-container/started-generic-container';

import { EmailServerSettings } from '@ad/src/emails/mailer';
import { bindContainerLogs, defaultEnvironment, formatContainerNameWithSuffix } from '@ad/src/utils/testcontainers';

const __root_dirname = process.cwd();

export interface MailcatcherContainer {
  container: StartedGenericContainer;
  settings: EmailServerSettings;
}

export async function setupMailcatcher(): Promise<MailcatcherContainer> {
  const dummyHost = '127.0.0.1';
  const dummyUser = '';
  const dummyPassword = '';
  const dummyPort = '1025';

  const isPipelineWorker = process.env.CI === 'true';
  if (isPipelineWorker) {
    process.env.TESTCONTAINERS_RYUK_DISABLED = 'true';
  }

  const composeFilePath = path.resolve(__root_dirname, './');
  const composeFile = 'docker-compose.yaml';
  const serviceName = 'mailcatcher';
  const containerName = formatContainerNameWithSuffix('ad_mailcatcher_container');

  const environment = await new DockerComposeEnvironment(composeFilePath, composeFile)
    .withEnvironment({
      ...defaultEnvironment,
      EMAIL_HOST: dummyHost,
      EMAIL_HOST_USER: dummyUser,
      EMAIL_HOST_PASSWORD: dummyPassword,
      EMAIL_PORT: dummyPort,
    })
    .withWaitStrategy(serviceName, Wait.forHealthCheck())
    .up([serviceName]);

  const container = environment.getContainer(containerName);

  bindContainerLogs(container, {
    enabled: false,
  });

  const ip = container.getHost();
  const mappedPort = container.getMappedPort(1025);

  const settings: EmailServerSettings = {
    host: ip,
    port: mappedPort,
    user: dummyUser,
    password: dummyPassword,
  };

  return {
    container,
    settings,
  };
}
