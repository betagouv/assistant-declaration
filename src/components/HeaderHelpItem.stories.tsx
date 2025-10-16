import { Meta, StoryFn } from '@storybook/react';
import { EventEmitter } from 'eventemitter3';
import { screen, userEvent, within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { HeaderHelpItem } from '@ad/src/components/HeaderHelpItem';

type ComponentType = typeof HeaderHelpItem;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/HeaderHelpItem',
  component: HeaderHelpItem,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const eventEmitter = new EventEmitter();

  args.eventEmitter = eventEmitter;

  return (
    <Button
      onClick={(event) => {
        eventEmitter.emit('click', event);
      }}
    >
      <HeaderHelpItem {...args} />
    </Button>
  );
};

const UnclickedStory = Template.bind({});
UnclickedStory.args = {};
UnclickedStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button');
};

export const Unclicked = prepareStory(UnclickedStory);

const ClickedStory = Template.bind({});
ClickedStory.args = {
  ...UnclickedStory.args,
};
ClickedStory.play = async ({ canvasElement }) => {
  const button = await within(canvasElement).findByRole('button');

  // Needed otherwise `HeaderHelpItem` has not yet enabled its click listener of `eventEmitter`
  await new Promise((resolve) => setTimeout(resolve, 100));

  await userEvent.click(button);

  const dialog = await screen.findByRole('menu');
  await within(dialog).findByRole('button', {
    name: /messagerie/i,
  });
};

export const Clicked = prepareStory(ClickedStory);
