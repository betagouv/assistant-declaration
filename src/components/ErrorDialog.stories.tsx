import { Meta, StoryFn } from '@storybook/react';
import { screen, userEvent, within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { ErrorDialog } from '@ad/src/components/ErrorDialog';
import { useSingletonErrorDialog } from '@ad/src/components/modal/useModal';

type ComponentType = typeof ErrorDialog;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/ErrorDialog',
  component: ErrorDialog,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playOpenAndFindElement(canvasElement: HTMLElement): Promise<HTMLElement> {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button');

  await userEvent.click(button);

  const dialog = await screen.findByRole('dialog');
  return await within(dialog).findByRole('button', {
    name: /d'accord/i,
  });
}

const Template: StoryFn<ComponentType> = (args) => {
  const { showErrorDialog } = useSingletonErrorDialog();

  const onClick = async () => {
    showErrorDialog({
      ...args,
    });
  };

  return <Button onClick={onClick}>Display the error dialog</Button>;
};

const DefaultStory = Template.bind({});
DefaultStory.args = {
  description: <>An error has occured while changing your address.</>,
  error: new Error('this is a custom test error'),
};
DefaultStory.play = async ({ canvasElement }) => {
  await playOpenAndFindElement(canvasElement);
};

export const Default = prepareStory(DefaultStory);
