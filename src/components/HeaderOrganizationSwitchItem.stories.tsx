import Button from '@mui/material/Button';
import { Meta, StoryFn } from '@storybook/react';
import { screen, userEvent, within } from '@storybook/test';
import { EventEmitter } from 'eventemitter3';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { HeaderOrganizationSwitchItem } from '@ad/src/components/HeaderOrganizationSwitchItem';
import { collaboratorOfSample } from '@ad/src/fixtures/ui';
import { UserInterfaceOrganizationSchemaType } from '@ad/src/models/entities/ui';

type ComponentType = typeof HeaderOrganizationSwitchItem;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/HeaderOrganizationSwitchItem',
  component: HeaderOrganizationSwitchItem,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const uiOrgonizations: UserInterfaceOrganizationSchemaType[] = [...collaboratorOfSample];

const Template: StoryFn<ComponentType> = (args) => {
  const eventEmitter = new EventEmitter();

  args.eventEmitter = eventEmitter;

  return (
    <Button
      onClick={(event) => {
        eventEmitter.emit('click', event);
      }}
    >
      <HeaderOrganizationSwitchItem {...args} />
    </Button>
  );
};

const UnclickedStory = Template.bind({});
UnclickedStory.args = {
  organizations: uiOrgonizations,
  currentOrganization: uiOrgonizations[0],
};
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

  // Needed otherwise `HeaderOrganizationSwitchItem` has not yet enabled its click listener of `eventEmitter`
  await new Promise((resolve) => setTimeout(resolve, 100));

  await userEvent.click(button);

  const dialog = await screen.findByRole('menu');
  await within(dialog).findByRole('menuitem', {
    name: uiOrgonizations[0].name,
  });
};

export const Clicked = prepareStory(ClickedStory);

// The parent should not display this component is there is only 1 organization
// It should select it by default
const OnlyOneOrganizationStory = Template.bind({});
OnlyOneOrganizationStory.args = {
  organizations: [uiOrgonizations[0]],
};
OnlyOneOrganizationStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button');
};

export const OnlyOneOrganization = prepareStory(OnlyOneOrganizationStory);

const NoneStory = Template.bind({});
NoneStory.args = {
  organizations: [],
};
NoneStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button');
};

export const None = prepareStory(NoneStory);
