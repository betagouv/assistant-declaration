import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { userSessionContext } from '@ad/.storybook/auth';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMain, playFindProgressBar } from '@ad/.storybook/testing';
import { PrivateLayout } from '@ad/src/app/(private)/PrivateLayout';
import { Loading as PublicLayoutLoadingStory, Lorem as PublicLayoutLoremStory } from '@ad/src/app/(public)/PublicLayout.stories';
import { collaboratorOfSample } from '@ad/src/fixtures/ui';
import { UserInterfaceSessionSchema, UserInterfaceSessionSchemaType } from '@ad/src/models/entities/ui';
import { getTRPCMock } from '@ad/src/server/mock/trpc';
import { linkRegistry } from '@ad/src/utils/routes/registry';

type ComponentType = typeof PrivateLayout;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Layouts/PrivatePages',
  component: PrivateLayout,
  excludeStories: ['interfaceSessionQueryFactory'],
  ...generateMetaDefault({
    parameters: {
      layout: 'fullscreen',
      msw: {
        handlers: [],
      },
    },
  }),
} as Meta<ComponentType>;

export function interfaceSessionQueryFactory(session: UserInterfaceSessionSchemaType) {
  return {
    msw: {
      handlers: [
        getTRPCMock({
          type: 'query',
          path: ['getInterfaceSession'],
          response: {
            session: UserInterfaceSessionSchema.parse(session),
          },
        }),
      ],
    },
  };
}

const Template: StoryFn<ComponentType> = (args) => {
  return <PrivateLayout {...args} />;
};

const AsNewUserStory = Template.bind({});
AsNewUserStory.args = {};
AsNewUserStory.parameters = {
  nextAuthMock: {
    session: userSessionContext,
  },
  nextjs: {
    navigation: {
      pathname: linkRegistry.get('organization', {
        organizationId: collaboratorOfSample[0].id,
      }),
    },
  },
  ...interfaceSessionQueryFactory({
    collaboratorOf: [],
    isAdmin: false,
  }),
};
AsNewUserStory.play = async ({ canvasElement }) => {
  await playFindMain(canvasElement);
};

export const AsNewUser = prepareStory(AsNewUserStory);

const AsCollaboratorStory = Template.bind({});
AsCollaboratorStory.args = {};
AsCollaboratorStory.parameters = {
  ...AsNewUserStory.parameters,
  ...interfaceSessionQueryFactory({
    collaboratorOf: collaboratorOfSample,
    isAdmin: false,
  }),
};
AsCollaboratorStory.play = async ({ canvasElement }) => {
  await playFindMain(canvasElement);
};

export const AsCollaborator = prepareStory(AsCollaboratorStory);

const LoremStory = Template.bind({});
LoremStory.args = {
  ...PublicLayoutLoremStory.args,
};
LoremStory.parameters = {
  ...AsNewUserStory.parameters,
};
LoremStory.play = async ({ canvasElement }) => {
  await playFindMain(canvasElement);
};

export const Lorem = prepareStory(LoremStory);
Lorem.storyName = 'With lorem';

const LoadingStory = Template.bind({});
LoadingStory.args = {
  ...PublicLayoutLoadingStory.args,
};
LoadingStory.parameters = {
  ...AsNewUserStory.parameters,
};
LoadingStory.play = async ({ canvasElement }) => {
  await playFindProgressBar(canvasElement, /chargement/i);
};

export const Loading = prepareStory(LoadingStory);
Loading.storyName = 'With loader';
