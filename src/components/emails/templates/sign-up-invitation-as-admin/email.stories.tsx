import { Meta, StoryFn } from '@storybook/react';

import { withEmailClientOverviewFactory, withEmailRenderer } from '@ad/.storybook/email';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { SignUpInvitationAsAdminEmail, formatTitle } from '@ad/src/components/emails/templates/sign-up-invitation-as-admin/email';

type ComponentType = typeof SignUpInvitationAsAdminEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/SignUpInvitationAsAdmin',
  component: SignUpInvitationAsAdminEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent when a non-user is invited to become administrator on the platform.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <SignUpInvitationAsAdminEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Thomas',
  lastname: 'Lefebvre',
  originatorFirstname: 'Jean',
  originatorLastname: 'Derrien',
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
