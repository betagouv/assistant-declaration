import { Meta, StoryFn } from '@storybook/react';

import { withEmailClientOverviewFactory, withEmailRenderer } from '@ad/.storybook/email';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { CaseAssignedBySomeoneEmail, formatTitle } from '@ad/src/components/emails/templates/case-assigned-by-someone/email';

type ComponentType = typeof CaseAssignedBySomeoneEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/CaseAssignedBySomeone',
  component: CaseAssignedBySomeoneEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent when someone assigned to the agent a case.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <CaseAssignedBySomeoneEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Thomas',
  originatorFirstname: 'Jean',
  originatorLastname: 'Derrien',
  caseUrl: '',
  caseHumanId: '65',
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
