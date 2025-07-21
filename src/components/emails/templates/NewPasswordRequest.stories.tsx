import { Meta, StoryFn } from '@storybook/react';

import { WithEmailClientOverviewFactory } from '@ad/.storybook/WithEmailClientOverviewFactory';
import { WithEmailRenderer } from '@ad/.storybook/WithEmailRenderer';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { NewPasswordRequestEmail } from '@ad/src/components/emails/templates/NewPasswordRequest';
import { titles } from '@ad/src/components/emails/templates/common';

type ComponentType = typeof NewPasswordRequestEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/NewPasswordRequest',
  component: NewPasswordRequestEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent to users asking for a new password.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <NewPasswordRequestEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Thomas',
  resetPasswordUrlWithToken: '',
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
ClientOverviewStory.decorators = [WithEmailRenderer, WithEmailClientOverviewFactory(titles.NewPasswordRequestEmail)];
ClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const ClientOverview = prepareStory(ClientOverviewStory);
