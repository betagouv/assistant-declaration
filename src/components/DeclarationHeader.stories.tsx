import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { DeclarationHeader } from '@ad/src/components/DeclarationHeader';
import { eventsSeries } from '@ad/src/fixtures/event';
import { organizations } from '@ad/src/fixtures/organization';

type ComponentType = typeof DeclarationHeader;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/DeclarationHeader',
  component: DeclarationHeader,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playFindElement(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await within(canvasElement).findByRole('tab', { name: /sacem/i });
}

const Template: StoryFn<typeof DeclarationHeader> = (args) => {
  return <DeclarationHeader {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  organizationId: organizations[0].id,
  eventSerie: eventsSeries[0],
  currentDeclaration: 'sacem',
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindElement(canvasElement);
};

export const Normal = prepareStory(NormalStory, {});
