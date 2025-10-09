import { Meta, StoryFn } from '@storybook/react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindNavigation } from '@ad/.storybook/testing';
import { AsVisitor as PublicLayoutAsVisitorStory } from '@ad/src/app/(public)/PublicLayout.stories';
import { DocsLayout } from '@ad/src/app/(public)/docs/DocsLayout';

type ComponentType = typeof DocsLayout;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();
export default {
  title: 'Layouts/DocsPages',
  component: DocsLayout,
  ...generateMetaDefault({
    parameters: {
      layout: 'fullscreen',
      msw: {
        handlers: [],
      },
    },
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <DocsLayout {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.parameters = {};
NormalStory.args = {};
NormalStory.play = async ({ canvasElement }) => {
  await playFindNavigation(canvasElement, /documentation/i);
};

export const Normal = prepareStory(NormalStory);

const LoremStory = Template.bind({});
LoremStory.parameters = {
  ...NormalStory.parameters,
};
LoremStory.args = {
  children: (
    <>
      <h1>Hello!</h1>
      <p>
        Eum perferendis expedita necessitatibus libero et ipsa est. Tempora voluptatibus repudiandae aliquid id laborum repellendus reiciendis labore.
      </p>
      <p>
        Assumenda consectetur veniam. Ut accusantium in numquam. Quasi facilis sint. Quod eum nam dolore voluptas in et consequatur nulla. Quia
        quaerat dicta sit exercitationem in aliquid. Laboriosam tenetur voluptatem consequatur quis laudantium non. Sed id soluta mollitia vel qui
        ipsa beatae.
      </p>
      <p>
        Sequi rem modi. Sunt consectetur quidem assumenda eos. Ut adipisci ut cum dolor aut nemo eum animi. Maiores sed voluptatem deserunt nostrum
        voluptatum et. Et est ab.
      </p>
    </>
  ),
};
LoremStory.play = async ({ canvasElement }) => {
  await playFindNavigation(canvasElement, /documentation/i);
};

export const Lorem = prepareStory(LoremStory);
Lorem.storyName = 'With lorem';

const WithLayoutStory = Template.bind({});
WithLayoutStory.parameters = {
  ...NormalStory.parameters,
};
WithLayoutStory.args = {
  ...NormalStory.args,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindNavigation(canvasElement, /documentation/i);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PublicLayoutAsVisitorStory,
});
