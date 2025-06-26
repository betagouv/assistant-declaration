import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindForm, playFindFormInMain } from '@ad/.storybook/testing';
import { AsNewUser as PrivateLayoutAsNewUserStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { Empty as ConnectTicketingSystemFormEmptyStory } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/ConnectTicketingSystemForm.stories';
import {
  TicketingSystemConnectionPage,
  TicketingSystemConnectionPageContext,
} from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-system/connect/TicketingSystemConnectionPage';
import { organizations } from '@ad/src/fixtures/organization';

type ComponentType = typeof TicketingSystemConnectionPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/ConnectTicketingSystem',
  component: TicketingSystemConnectionPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <TicketingSystemConnectionPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  params: {
    organizationId: organizations[0].id,
  },
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindForm(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: TicketingSystemConnectionPageContext,
    value: {
      ContextualConnectTicketingSystemForm: ConnectTicketingSystemFormEmptyStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...NormalStory.args,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindFormInMain(canvasElement);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsNewUserStory,
  childrenContext: {
    context: TicketingSystemConnectionPageContext,
    value: {
      ContextualConnectTicketingSystemForm: ConnectTicketingSystemFormEmptyStory,
    },
  },
});
