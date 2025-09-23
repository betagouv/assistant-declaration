import { Meta, StoryFn } from '@storybook/react';
import { useState } from 'react';
import { screen, userEvent, within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Button } from '@ad/src/components/Button';
import { Normal as EventsSalesOverviewNormalStory } from '@ad/src/components/EventsSalesOverview.stories';
import { EventsSalesViewer } from '@ad/src/components/EventsSalesViewer';
import { EventsSalesViewerContext } from '@ad/src/components/EventsSalesViewerContext';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';
import { workaroundAssert as assert } from '@ad/src/utils/assert';

type ComponentType = typeof EventsSalesViewer;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/EventsSalesViewer',
  component: EventsSalesViewer,
  excludeStories: ['reusableNormal'],
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

async function playOpenAndFindElement(canvasElement: HTMLElement): Promise<HTMLElement> {
  const canvas = within(canvasElement);
  const button = canvas.getByRole('button');

  await userEvent.click(button);

  const presentation = (await screen.findAllByRole('presentation')).find((element) => element.classList.contains('MuiDrawer-root'));

  assert(presentation);

  return await within(presentation).findByText(/données/i);
}

const Template: StoryFn<ComponentType> = (args) => {
  const [open, setOpen] = useState<boolean>(args.open);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        Display the ticketing viewer
      </Button>
      <EventsSalesViewer
        {...args}
        overview={{
          eventSerie: eventsSeries[0],
          wrappers: eventsWrappers,
        }}
        open={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
};

const reusableTemplate: StoryFn<ComponentType> = (args) => {
  return <EventsSalesViewer {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  overview: {
    eventSerie: eventsSeries[0],
    wrappers: eventsWrappers,
  },
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await playOpenAndFindElement(canvasElement);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: EventsSalesViewerContext,
    value: {
      ContextualEventsSalesOverview: EventsSalesOverviewNormalStory,
    },
  },
});

const reusableNormalStory = reusableTemplate.bind({});
reusableNormalStory.args = {
  ...NormalStory.args,
};
reusableNormalStory.parameters = {
  ...NormalStory.parameters,
};

// eslint-disable-next-line storybook/prefer-pascal-case
export const reusableNormal = prepareStory(reusableNormalStory, {
  childrenContext: {
    context: EventsSalesViewerContext,
    value: {
      ContextualEventsSalesOverview: EventsSalesOverviewNormalStory,
    },
  },
});
