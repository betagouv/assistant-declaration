import { Meta, StoryFn } from '@storybook/react';

import { WithDocumentRenderer, commonDocumentsParameters } from '@ad/.storybook/document';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindDocumentStructure } from '@ad/.storybook/testing';
import { SacdDeclarationDocument } from '@ad/src/components/documents/templates/SacdDeclaration';
import { sacdDeclarations } from '@ad/src/fixtures/declaration/sacd';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof SacdDeclarationDocument;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Documents/Templates/SacdDeclaration',
  component: SacdDeclarationDocument,
  ...generateMetaDefault({
    parameters: {
      ...commonDocumentsParameters,
      docs: {
        description: {
          component: 'Document sent as declaration for SACD.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <SacdDeclarationDocument {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  sacdDeclaration: sacdDeclarations[0],
  eventsWrappers: eventsWrappers,
  taxRate: eventsSeries[0].taxRate,
  signatory: 'Jean Derrien',
};
NormalStory.decorators = [WithDocumentRenderer];
NormalStory.play = async ({ canvasElement }) => {
  await playFindDocumentStructure(canvasElement);
};

export const Normal = prepareStory(NormalStory);
