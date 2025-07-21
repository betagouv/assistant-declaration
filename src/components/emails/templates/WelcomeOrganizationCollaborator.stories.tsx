import { Meta, StoryFn } from '@storybook/react';

import { WithEmailClientOverviewFactory } from '@ad/.storybook/WithEmailClientOverviewFactory';
import { WithEmailRenderer } from '@ad/.storybook/WithEmailRenderer';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { WelcomeOrganizationCollaboratorEmail } from '@ad/src/components/emails/templates/WelcomeOrganizationCollaborator';
import { titles } from '@ad/src/components/emails/templates/common';

type ComponentType = typeof WelcomeOrganizationCollaboratorEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/WelcomeOrganizationCollaborator',
  component: WelcomeOrganizationCollaboratorEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent when a user is being promoted the access to a organization.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <WelcomeOrganizationCollaboratorEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Thomas',
  organizationDashboardUrl: '',
};
NormalStory.decorators = [WithEmailRenderer];
NormalStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const Normal = prepareStory(NormalStory);

const ClientOverviewStory = Template.bind({});
ClientOverviewStory.args = {
  ...NormalStory.args,
};
ClientOverviewStory.decorators = [WithEmailRenderer, WithEmailClientOverviewFactory(titles.WelcomeOrganizationCollaboratorEmail)];
ClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const ClientOverview = prepareStory(ClientOverviewStory);
