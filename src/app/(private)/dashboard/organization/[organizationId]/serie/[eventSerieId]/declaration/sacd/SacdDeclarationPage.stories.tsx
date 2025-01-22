import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { SacdDeclarationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacd/SacdDeclarationPage';
import { sacdDeclarations, sacdDeclarationsWrappers } from '@ad/src/fixtures/declaration/sacd';
import { eventCategoryTickets, eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof SacdDeclarationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/SacdDeclaration',
  component: SacdDeclarationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const mswCommonParameters = [
  getTRPCMock({
    type: 'query',
    path: ['getEventSerie'],
    response: {
      eventSerie: eventsSeries[0],
    },
  }),
  getTRPCMock({
    type: 'query',
    path: ['getSacdDeclaration'],
    response: {
      sacdDeclarationWrapper: sacdDeclarationsWrappers[0],
    },
  }),
  getTRPCMock({
    type: 'mutation',
    path: ['updateEventCategoryTickets'],
    response: {
      eventCategoryTickets: eventCategoryTickets[0],
    },
  }),
  getTRPCMock({
    type: 'mutation',
    path: ['fillSacdDeclaration'],
    response: {
      sacdDeclaration: sacdDeclarations[0],
    },
  }),
];

const commonComponentProps: ComponentProps<ComponentType> = {
  params: {
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <SacdDeclarationPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ...commonComponentProps,
};
NormalStory.parameters = {
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEvents'],
        response: {
          eventsWrappers: [eventsWrappers[0], eventsWrappers[1], eventsWrappers[2]],
        },
      }),
    ],
  },
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /déclaration/i);
};

export const Normal = prepareStory(NormalStory);

const NotFoundStory = Template.bind({});
NotFoundStory.args = {
  ...commonComponentProps,
};
NotFoundStory.parameters = {
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEvents'],
        response: {
          eventsWrappers: [],
        },
      }),
    ],
  },
};
NotFoundStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /déclaration/i);
};

export const NotFound = prepareStory(NotFoundStory);

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...commonComponentProps,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...NormalStory.parameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /déclaration/i);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsCollaboratorStory,
});
