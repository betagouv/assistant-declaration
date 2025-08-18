import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { TicketingSystemListPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/TicketingSystemListPage';
import { ticketingSystemSettings } from '@ad/src/core/ticketing/common';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { UpdateTicketingSystemSchemaType } from '@ad/src/models/actions/ticketing';
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
          ticketingSystems: [
            ticketingSystems[0],
            ticketingSystems[1],
            {
              ...ticketingSystems[2],
              name: 'GENERIC',
            },
          ],
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
        response: (req, params) => {
          // For whatever reason due to the `preprocess()` it will have the type `unknown` from tRPC `RouterInputs` whereas
          // the type is fine within the endpoint implementation... So casting for now since didn't find a proper way to fix this
          const parameters = params as UpdateTicketingSystemSchemaType;

          const ticketingSettings = ticketingSystemSettings[parameters.ticketingSystemName];

          return ticketingSettings.strategy === 'PUSH'
            ? {
                ticketingSystem: {
                  ...ticketingSystems[0],
                  name: parameters.ticketingSystemName, // To respect any check, set the requested ticketing system
                },
                pushStrategyToken: 'e1722981ebe9055a61a44f21bc2a037b1fd197127654f6f84b5424039a5e5866',
              }
            : {
                ticketingSystem: ticketingSystems[0],
                pushStrategyToken: undefined,
              };
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
