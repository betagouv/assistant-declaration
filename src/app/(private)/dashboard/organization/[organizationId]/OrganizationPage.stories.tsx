import { Meta, StoryFn } from '@storybook/react';
import { mockDateDecorator } from 'storybook-mock-date-decorator';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindAlert, playFindButton } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { OrganizationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPage';
import { eventsSeriesWrappers } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof OrganizationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Organization',
  component: OrganizationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const mswCommonParameters = [
  getTRPCMock({
    type: 'query',
    path: ['getOrganization'],
    response: {
      organization: OrganizationSchema.parse(organizations[0]),
    },
  }),
  getTRPCMock({
    type: 'mutation',
    path: ['synchronizeDataFromTicketingSystems'],
    response: undefined,
  }),
];

// [WORKAROUND] Since using the date mock on `NormalStory`, it leaks over other stories when switching the view, so we have to explicitely set a date for others
const workaroundDate = new Date('December 31, 2024 18:00:00 UTC');

const commonComponentProps: ComponentProps<ComponentType> = {
  params: {
    organizationId: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <OrganizationPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ...commonComponentProps,
};
NormalStory.parameters = {
  date: new Date('December 19, 2024 18:00:00 UTC'), // Mock date generation so underlying computed `lastSynchronizationTooOld` returns "false"
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEventsSeries'],
        response: {
          eventsSeriesWrappers: [eventsSeriesWrappers[0], eventsSeriesWrappers[1], eventsSeriesWrappers[2]],
        },
      }),
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [ticketingSystems[0]],
        },
      }),
    ],
  },
};
NormalStory.decorators = [mockDateDecorator];
NormalStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const Normal = prepareStory(NormalStory);

const DesynchronizedStory = Template.bind({});
DesynchronizedStory.args = {
  ...commonComponentProps,
};
DesynchronizedStory.parameters = {
  date: workaroundDate,
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEventsSeries'],
        response: {
          eventsSeriesWrappers: [eventsSeriesWrappers[0], eventsSeriesWrappers[1], eventsSeriesWrappers[2]],
        },
      }),
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [ticketingSystems[0]],
        },
      }),
    ],
  },
};
DesynchronizedStory.decorators = [mockDateDecorator];
DesynchronizedStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const Desynchronized = prepareStory(DesynchronizedStory);

const NeverSynchronizedStory = Template.bind({});
NeverSynchronizedStory.args = {
  ...commonComponentProps,
};
NeverSynchronizedStory.parameters = {
  date: workaroundDate,
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEventsSeries'],
        response: {
          eventsSeriesWrappers: [],
        },
      }),
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [
            {
              ...ticketingSystems[0],
              lastSynchronizationAt: null,
            },
          ],
        },
      }),
    ],
  },
};
NeverSynchronizedStory.decorators = [mockDateDecorator];
NeverSynchronizedStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const NeverSynchronized = prepareStory(NeverSynchronizedStory);

const NoTicketingSystemStory = Template.bind({});
NoTicketingSystemStory.args = {
  ...commonComponentProps,
};
NoTicketingSystemStory.parameters = {
  date: workaroundDate,
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEventsSeries'],
        response: {
          eventsSeriesWrappers: [],
        },
      }),
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [],
        },
      }),
    ],
  },
};
NoTicketingSystemStory.decorators = [mockDateDecorator];
NoTicketingSystemStory.play = async ({ canvasElement }) => {
  await playFindAlert(canvasElement);
};

export const NoTicketingSystem = prepareStory(NoTicketingSystemStory);

const NoEventSerieStory = Template.bind({});
NoEventSerieStory.args = {
  ...commonComponentProps,
};
NoEventSerieStory.parameters = {
  date: workaroundDate,
  msw: {
    handlers: [
      ...mswCommonParameters,
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listEventsSeries'],
        response: {
          eventsSeriesWrappers: [],
        },
      }),
      getTRPCMock({
        type: 'query' as 'query',
        path: ['listTicketingSystems'],
        response: {
          ticketingSystems: [ticketingSystems[0]],
        },
      }),
    ],
  },
};
NoEventSerieStory.decorators = [mockDateDecorator];
NoEventSerieStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const NoEventSerie = prepareStory(NoEventSerieStory);

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...commonComponentProps,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...NormalStory.parameters,
};
WithLayoutStory.decorators = [mockDateDecorator];
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsCollaboratorStory,
});
