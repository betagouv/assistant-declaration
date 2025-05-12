import Button from '@mui/material/Button';
import { Meta, StoryFn } from '@storybook/react';
import { within } from '@storybook/test';
import { useState } from 'react';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Normal as EventsSalesOverviewNormalStory } from '@ad/src/components/EventsSalesOverview.stories';
import { EventsSalesViewer, EventsSalesViewerContext } from '@ad/src/components/EventsSalesViewer';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';

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

const Template: StoryFn<ComponentType> = (args) => {
  const [open, setOpen] = useState<boolean>(args.open);

  return (
    <>
      <Button
        onClick={() => {
          setOpen(true);
        }}
        variant="contained"
      >
        Display the ticketing viewer
      </Button>
      <EventsSalesViewer
        {...args}
        overview={{
          wrappers: eventsWrappers,
          eventSerie: eventsSeries[0],
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
    wrappers: eventsWrappers,
    eventSerie: eventsSeries[0],
  },
};
NormalStory.parameters = {};
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('textbox', {
    name: /date/i,
  });
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
