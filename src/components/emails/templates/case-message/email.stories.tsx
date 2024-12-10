import { Meta, StoryFn } from '@storybook/react';

import { withEmailClientOverviewFactory, withEmailRenderer } from '@ad/.storybook/email';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import sampleAllElement from '@ad/src/components/Editor/sample-all-elements.lexical';
import { CaseMessageEmail, formatTitle } from '@ad/src/components/emails/templates/case-message/email';
import { inlineEditorStateToHtml } from '@ad/src/components/utils/lexical';
import { emailAttachments } from '@ad/src/fixtures/attachment';

type ComponentType = typeof CaseMessageEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/CaseMessage',
  component: CaseMessageEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent when an agent send a message to someone.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <CaseMessageEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  subject: 'Ut sit similique enim est quia consequatur omnis',
  caseHumanId: '286',
  htmlMessageContent: inlineEditorStateToHtml(sampleAllElement),
  attachments: [emailAttachments[0]],
};
NormalStory.parameters = {
  a11y: {
    // TODO: once solution found, adjust to exclude the email lexical content at the general level
    // Ref: https://github.com/storybookjs/storybook/issues/20813
    disable: true,
  },
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
