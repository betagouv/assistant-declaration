import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { TicketingSystemListPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/TicketingSystemListPage';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof TicketingSystemListPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/TicketingSystemList',
  component: TicketingSystemListPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [ticketingSystems[0], ticketingSystems[1], ticketingSystems[2]],
        },
      }),
      getTRPCMock({
        type: 'mutation',
        path: ['disconnectTicketingSystem'],
        response: undefined,
      }),
      getTRPCMock({
        type: 'mutation',
        path: ['updateTicketingSystem'],
        response: {
          ticketingSystem: ticketingSystems[0],
        },
      }),
    ],
  },
};

const commonComponentProps: ComponentProps<ComponentType> = {
  params: {
    organizationId: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
  },
};

async function playFindTitle(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await playFindMainTitle(canvasElement, /billetteries/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  return <TicketingSystemListPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ...commonComponentProps,
};
NormalStory.parameters = {
  ...defaultMswParameters,
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindTitle(canvasElement);
};

export const Normal = prepareStory(NormalStory, {});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...commonComponentProps,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...defaultMswParameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindTitle(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsCollaboratorStory,
});
