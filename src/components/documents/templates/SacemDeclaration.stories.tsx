import { Meta, StoryFn } from '@storybook/react';

import { WithDocumentRenderer } from '@ad/.storybook/WithDocumentRenderer';
import { commonDocumentsParameters } from '@ad/.storybook/document';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindDocumentStructure } from '@ad/.storybook/testing';
import { SacemDeclarationDocument } from '@ad/src/components/documents/templates/SacemDeclaration';
import { sacemDeclarations } from '@ad/src/fixtures/declaration/sacem';

type ComponentType = typeof SacemDeclarationDocument;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Documents/Templates/SacemDeclaration',
  component: SacemDeclarationDocument,
  ...generateMetaDefault({
    parameters: {
      ...commonDocumentsParameters,
      docs: {
        description: {
          component: 'Document sent as declaration for Sacem.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <SacemDeclarationDocument {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  sacemDeclaration: sacemDeclarations[0],
  signatory: 'Jean Derrien',
};
NormalStory.decorators = [WithDocumentRenderer];
NormalStory.play = async ({ canvasElement }) => {
  await playFindDocumentStructure(canvasElement);
};

export const Normal = prepareStory(NormalStory);
