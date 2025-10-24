import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { UploaderFileList } from '@ad/src/components/uploader/UploaderFileList';
import {
  Complete as UploaderFileListItemCompleteStory,
  Failed as UploaderFileListItemFailedStory,
} from '@ad/src/components/uploader/UploaderFileListItem.stories';
import { EnhancedUppyFile } from '@ad/src/utils/uppy';

type ComponentType = typeof UploaderFileList;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/UploaderFileList',
  component: UploaderFileList,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <UploaderFileList {...args} />;
};

const SampleStory = Template.bind({});
SampleStory.args = {
  files: [
    { ...(UploaderFileListItemCompleteStory.args?.file as EnhancedUppyFile), id: '1' },
    { ...(UploaderFileListItemFailedStory.args?.file as EnhancedUppyFile), id: '2' },
    { ...(UploaderFileListItemCompleteStory.args?.file as EnhancedUppyFile), id: '3' },
  ],
  onCancel: () => {},
  onRemove: () => {},
  onRetry: () => {},
};
SampleStory.parameters = {};
SampleStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findAllByRole('button', {
    name: /supprimer/i,
  });
};

export const Sample = prepareStory(SampleStory);
