import { Meta, StoryFn } from '@storybook/react';

import { commonEmailsParameters, withEmailClientOverviewFactory, withEmailRenderer } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { CaseRequestConfirmationEmail, formatTitle } from '@ad/src/components/emails/templates/case-request-confirmation/email';
import { addresses } from '@ad/src/fixtures/address';
import { phoneInputs } from '@ad/src/fixtures/phone';
import { RequestCaseSchemaType } from '@ad/src/models/actions/case';
import { CitizenGenderIdentitySchema } from '@ad/src/models/entities/citizen';

type ComponentType = typeof CaseRequestConfirmationEmail;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Templates/CaseRequestConfirmation',
  component: CaseRequestConfirmationEmail,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Email sent after the citizen fulfilled a new case.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <CaseRequestConfirmationEmail {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  firstname: 'Théodora',
  lastname: 'Aubert',
  caseHumanId: '76',
  authorityName: 'Bretagne',
  submittedRequestData: {
    authorityId: '00000000-0000-0000-0000-000000000000',
    email: 'jean@france.fr',
    firstname: 'Théodora',
    lastname: 'Aubert',
    genderIdentity: CitizenGenderIdentitySchema.Values.FEMALE,
    address: {
      ...addresses[0],
    },
    phone: {
      ...phoneInputs[0],
    },
    alreadyRequestedInThePast: true,
    gotAnswerFromPreviousRequest: true,
    description:
      'Et velit itaque et ea. Nobis eveniet quo incidunt ut tempora placeat. Quis repellat quod reprehenderit provident ut vero veritatis repellat. Necessitatibus provident blanditiis exercitationem accusantium. Laboriosam quae harum rerum et corrupti rem sed.',
    emailCopyWanted: false,
    attachments: [],
  },
};
NormalStory.decorators = [withEmailRenderer];
NormalStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const Normal = prepareStory(NormalStory);

const NormalClientOverviewStory = Template.bind({});
NormalClientOverviewStory.args = {
  ...NormalStory.args,
};
NormalClientOverviewStory.decorators = [withEmailRenderer, withEmailClientOverviewFactory(formatTitle())];
NormalClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const NormalClientOverview = prepareStory(NormalClientOverviewStory);

const WithSubmittedDataStory = Template.bind({});
WithSubmittedDataStory.args = {
  ...NormalStory.args,
  submittedRequestData: {
    ...((NormalStory.args ? NormalStory.args.submittedRequestData : {}) as RequestCaseSchemaType),
    emailCopyWanted: true,
  },
};
WithSubmittedDataStory.decorators = [withEmailRenderer];
WithSubmittedDataStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const WithSubmittedData = prepareStory(WithSubmittedDataStory);

const WithSubmittedDataClientOverviewStory = Template.bind({});
WithSubmittedDataClientOverviewStory.args = {
  ...WithSubmittedDataStory.args,
};
WithSubmittedDataClientOverviewStory.decorators = [withEmailRenderer, withEmailClientOverviewFactory(formatTitle())];
WithSubmittedDataClientOverviewStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const WithSubmittedDataClientOverview = prepareStory(WithSubmittedDataClientOverviewStory);
