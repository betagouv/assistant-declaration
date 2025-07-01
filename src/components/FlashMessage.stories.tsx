import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { FlashMessage } from '@ad/src/components/FlashMessage';

type ComponentType = typeof FlashMessage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/FlashMessage',
  component: FlashMessage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <FlashMessage {...args} />;
};

const DevelopmentEnvStory = Template.bind({});
DevelopmentEnvStory.args = {
  appMode: 'dev',
  nodeEnv: 'production',
};
DevelopmentEnvStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/interne/i);
};

export const DevelopmentEnv = prepareStory(DevelopmentEnvStory);

const ProductionEnvStory = Template.bind({});
ProductionEnvStory.args = {
  appMode: 'prod',
  nodeEnv: 'production',
};
ProductionEnvStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByText(/merci/i);
};

export const ProductionEnv = prepareStory(ProductionEnvStory);
