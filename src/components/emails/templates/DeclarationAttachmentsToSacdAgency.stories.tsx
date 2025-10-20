import { Meta, StoryFn } from '@storybook/react';

import { WithEmailClientOverviewFactory } from '@ad/.storybook/WithEmailClientOverviewFactory';
import { WithEmailRenderer } from '@ad/.storybook/WithEmailRenderer';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { DeclarationAttachmentsToSacdAgencyEmail } from '@ad/src/components/emails/templates/DeclarationAttachmentsToSacdAgency';
import { titles } from '@ad/src/components/emails/templates/common';
import { emailAttachments } from '@ad/src/fixtures/attachment';
import { eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';
import { users } from '@ad/src/fixtures/user';

type ComponentType = typeof DeclarationAttachmentsToSacdAgencyEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/DeclarationAttachmentsToSacdAgency',
  component: DeclarationAttachmentsToSacdAgencyEmail,
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
  return <DeclarationAttachmentsToSacdAgencyEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  eventSerieName: eventsSeries[0].name,
  originatorFirstname: users[0].firstname,
  originatorLastname: users[0].lastname,
  originatorEmail: users[0].email,
  organizationName: organizations[0].name,
  attachments: [emailAttachments[0]],
  aboutUrl: '',
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
ClientOverviewStory.decorators = [WithEmailRenderer, WithEmailClientOverviewFactory(titles.DeclarationAttachmentsToSacdAgencyEmail)];
ClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const ClientOverview = prepareStory(ClientOverviewStory);
