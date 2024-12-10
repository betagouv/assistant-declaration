import { Meta, StoryFn } from '@storybook/react';

import { commonEmailsParameters, withEmailClientOverviewFactory, withEmailRenderer } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { SignUpInvitationAsAgentEmail, formatTitle } from '@ad/src/components/emails/templates/sign-up-invitation-as-agent/email';

type ComponentType = typeof SignUpInvitationAsAgentEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/SignUpInvitationAsAgent',
  component: SignUpInvitationAsAgentEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent when a non-user is invited to become agent of an authority.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <SignUpInvitationAsAgentEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Thomas',
  lastname: 'Lefebvre',
  originatorFirstname: 'Jean',
  originatorLastname: 'Derrien',
  authorityName: 'Bretagne',
  signUpUrlWithToken: '',
};
NormalStory.decorators = [withEmailRenderer];
NormalStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const Normal = prepareStory(NormalStory);

const ClientOverviewStory = Template.bind({});
ClientOverviewStory.args = {
  ...NormalStory.args,
};
ClientOverviewStory.decorators = [withEmailRenderer, withEmailClientOverviewFactory(formatTitle())];
ClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const ClientOverview = prepareStory(ClientOverviewStory);
