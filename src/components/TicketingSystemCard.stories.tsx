import { Meta, StoryFn } from '@storybook/react';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Empty as UpdateTicketingSystemFormEmptyStory } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/ticketing-systems/UpdateTicketingSystemForm.stories';
import { TicketingSystemCard, TicketingSystemCardContext } from '@ad/src/components/TicketingSystemCard';
import { ticketingSystems } from '@ad/src/fixtures/ticketing';

type ComponentType = typeof TicketingSystemCard;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/TicketingSystemCard',
  component: TicketingSystemCard,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playFindElement(canvasElement: HTMLElement): Promise<HTMLElement> {
  return await within(canvasElement).findByText(/billetweb/i);
}

const Template: StoryFn<typeof TicketingSystemCard> = (args) => {
  return <TicketingSystemCard {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ticketingSystem: ticketingSystems[0],
  disconnectAction: async () => {},
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindElement(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: TicketingSystemCardContext,
    value: {
      ContextualUpdateTicketingSystemForm: UpdateTicketingSystemFormEmptyStory,
    },
  },
});
