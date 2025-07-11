import { MjmlButton, MjmlText } from '@faire/mjml-react';
import { Meta, StoryFn } from '@storybook/react';

import { WithEmailRenderer } from '@ad/.storybook/WithEmailRenderer';
import { commonEmailsParameters } from '@ad/.storybook/email';
import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindEmailStructure } from '@ad/.storybook/testing';
import { StandardLayout } from '@ad/src/components/emails/layouts/Standard';

type ComponentType = typeof StandardLayout;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Emails/Layouts/Standard',
  component: StandardLayout,
  ...generateMetaDefault({
    parameters: {
      ...commonEmailsParameters,
      docs: {
        description: {
          component: 'Standard email layout that wraps content.',
        },
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <StandardLayout {...args} />;
};

const EmptyStory = Template.bind({});
EmptyStory.args = {};
EmptyStory.decorators = [WithEmailRenderer];
EmptyStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const Empty = prepareStory(EmptyStory);

const LoremStory = Template.bind({});
LoremStory.args = {
  title: 'Quia sunt eum.',
  children: (
    <>
      <MjmlText>
        <h1>Fuga quis qui</h1>
        <p>Labore sint et. Porro non doloremque vel magnam eaque adipisci. Sit sint ducimus magnam sint eaque cum laborum.</p>
        <p>
          Corporis eius voluptatem aut voluptas laborum quo et itaque consequuntur. Modi perspiciatis vel necessitatibus illum et. Tempora ut sit qui.
        </p>
      </MjmlText>
      <MjmlButton>Ratione autem</MjmlButton>
      <MjmlText>
        <p>
          In delectus harum sed harum molestias fugiat fugiat et quae. Ratione atque nobis autem id saepe quia voluptatem ad laborum. Nihil
          reprehenderit aperiam et est. Quia et provident ex quaerat aliquid voluptatem vel.
        </p>
      </MjmlText>
    </>
  ),
};
LoremStory.decorators = [WithEmailRenderer];
LoremStory.play = async ({ canvasElement }) => {
  await playFindEmailStructure(canvasElement);
};

export const Lorem = prepareStory(LoremStory);
