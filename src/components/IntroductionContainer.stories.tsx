import { fr } from '@codegouvfr/react-dsfr';
import { Meta, StoryFn } from '@storybook/react';
import Image from 'next/image';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { IntroductionContainer } from '@ad/src/components/IntroductionContainer';

type ComponentType = typeof IntroductionContainer;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/IntroductionContainer',
  component: IntroductionContainer,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  return <IntroductionContainer {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  left: (
    <div className={fr.cx('fr-py-6v', 'fr-px-8v')}>
      <div className={fr.cx('fr-h2')} style={{ maxWidth: 500 }}>
        Esse sit laborum
      </div>
      <p style={{ maxWidth: 500 }}>Aut aut iure minus sint perspiciatis dolorem iusto molestias ullam.</p>
      <Button onClick={() => {}}>Ipsum</Button>
    </div>
  ),
  right: (
    <Image
      src="https://via.placeholder.com/400x350"
      width={400}
      height={350}
      alt=""
      style={{
        width: '100%',
        maxHeight: '350px',
        objectFit: 'contain',
        objectPosition: 'left center',
      }}
    />
  ),
};
NormalStory.parameters = {};

export const Normal = prepareStory(NormalStory);
