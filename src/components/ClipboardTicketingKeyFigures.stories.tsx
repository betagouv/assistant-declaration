import { fr } from '@codegouvfr/react-dsfr';
import { Meta, StoryFn } from '@storybook/react';
import { set } from 'date-fns';
import { useState } from 'react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { ClipboardTicketingKeyFigures } from '@ad/src/components/ClipboardTicketingKeyFigures';
import { ClipboardTrigger } from '@ad/src/components/ClipboardTrigger';

type ComponentType = typeof ClipboardTicketingKeyFigures;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/ClipboardTicketingKeyFigures',
  component: ClipboardTicketingKeyFigures,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const Template: StoryFn<ComponentType> = (args) => {
  const [triggerCopy, setTriggerCopy] = useState(false);

  return (
    <>
      <ClipboardTicketingKeyFigures {...args} />
      {triggerCopy && (
        <ClipboardTrigger onCopy={() => setTriggerCopy(false)}>
          <ClipboardTicketingKeyFigures {...args} />
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
  startAt: set(new Date(0), { year: 2024, month: 11, date: 18 }),
  endAt: set(new Date(0), { year: 2024, month: 11, date: 30 }),
  eventsCount: 4,
  totalIncludingTaxesAmount: 1230,
  taxRate: 0.055,
  averageTicketPrice: 12.53,
  paidTickets: 50,
  freeTickets: 24,
};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('table');
};

export const Normal = prepareStory(NormalStory);
