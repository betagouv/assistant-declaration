import { fr } from '@codegouvfr/react-dsfr';
import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { ClipboardTicketingEventsSales } from '@ad/src/components/ClipboardTicketingEventsSales';
import { ClipboardTrigger } from '@ad/src/components/ClipboardTrigger';
import { eventsWrappers } from '@ad/src/fixtures/event';

type ComponentType = typeof ClipboardTicketingEventsSales;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/ClipboardTicketingEventsSales',
  component: ClipboardTicketingEventsSales,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const [triggerCopy, setTriggerCopy] = useState(false);

  return (
    <>
      <ClipboardTicketingEventsSales {...args} />
      {triggerCopy && (
        <ClipboardTrigger onCopy={() => setTriggerCopy(false)}>
          <ClipboardTicketingEventsSales {...args} />
        </ClipboardTrigger>
      )}
      <Button
        onClick={async () => {
          setTriggerCopy(true);
        }}
        nativeButtonProps={{
          className: fr.cx('fr-mt-6v'),
        }}
      >
        Copy
      </Button>
    </>
  );
};

const NormalStory = Template.bind({});
NormalStory.args = {
  eventSerieName: 'The real live performance',
  eventsWrappers: eventsWrappers,
};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('table');
};

export const Normal = prepareStory(NormalStory);
