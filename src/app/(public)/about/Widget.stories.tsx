import { Typography } from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Widget } from '@ad/src/app/(public)/about/Widget';
import computer from '@ad/src/assets/images/home/computer.svg';

type ComponentType = typeof Widget;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/Home/Widget',
  component: Widget,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <Widget {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  icon: computer,
  title: 'Rerum iste veritatis',
  children: (
    <>
      <Typography variant="body2" color="text.secondary">
        Eligendi iusto placeat eos qui laudantium perferendis. Aut ipsam eos. Ea doloremque animi deleniti voluptatibus consequatur quod.
        <br />
        <br />
        Vitae a optio labore veniam non qui. Quo qui suscipit consequatur vel non quidem reprehenderit nemo. Ratione soluta possimus. Delectus rerum
        et voluptatem sunt qui labore quam in architecto. Atque nemo est laborum nulla aperiam nostrum libero qui. Et eum facere sint iure.
        <br />
        <br />
        Beatae reiciendis corporis libero consequuntur. Ipsum totam velit est numquam facilis. Rerum eveniet alias corrupti quisquam. Aliquam vel
        tempore et. Expedita animi harum et soluta magni consequatur impedit perferendis.
      </Typography>
    </>
  ),
};
NormalStory.parameters = {};

export const Normal = prepareStory(NormalStory);
