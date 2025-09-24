import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { DeclarationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPage';
import { DeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPageContext';
import { Normal as DeclarationHeaderNormalStory } from '@ad/src/components/DeclarationHeader.stories';
import { sacemDeclarations, sacemDeclarationsWrappers } from '@ad/src/fixtures/declaration/sacem';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';
import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof DeclarationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Declaration',
  component: DeclarationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

function mswCommonParameters(options: { transmitted: boolean; noEvent: boolean }) {
  const adjustedDeclaration = {
    ...sacemDeclarations[0],
    transmittedAt: options.transmitted ? new Date('December 31, 2024 10:00:00 UTC') : null,
  };

  return [
    getTRPCMock({
      type: 'query',
      path: ['getEventSerie'],
      response: {
        eventSerie: eventsSeries[0],
        partialDeclarations: options.transmitted
          ? [
              {
                type: DeclarationTypeSchema.Values.SACEM,
                status: DeclarationStatusSchema.Values.PROCESSED,
                transmittedAt: new Date('December 31, 2024 10:00:00 UTC'),
              },
            ]
          : [],
      },
    }),
    getTRPCMock({
      type: 'query',
      path: ['getDeclaration'],
      response: {
        sacemDeclarationWrapper: { ...sacemDeclarationsWrappers[0], declaration: adjustedDeclaration },
      },
    }),
    getTRPCMock({
      type: 'mutation',
      path: ['fillDeclaration'],
      response: {
        sacemDeclaration: adjustedDeclaration,
      },
    }),
    getTRPCMock({
      type: 'query' as 'query',
      path: ['listEvents'],
      response: {
        eventsWrappers: options.noEvent ? [] : [eventsWrappers[0], eventsWrappers[1], eventsWrappers[2]],
      },
    }),
  ];
}

const commonComponentProps: ComponentProps<ComponentType> = {
  params: {
    organizationId: 'a79cb3ba-745e-5d9a-8903-4a02327a7e01',
    eventSerieId: 'd79cb3ba-745e-5d9a-8903-4a02327a7e01',
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <DeclarationPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ...commonComponentProps,
};
NormalStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: false, noEvent: false })],
  },
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const Normal = prepareStory(NormalStory, {
  childrenContext: {
    context: DeclarationPageContext,
    value: {
      ContextualDeclarationHeader: DeclarationHeaderNormalStory,
    },
  },
});

const TransmittedStory = Template.bind({});
TransmittedStory.args = {
  ...NormalStory.args,
};
TransmittedStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: true, noEvent: false })],
  },
};
TransmittedStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const Transmitted = prepareStory(TransmittedStory, {
  childrenContext: {
    context: DeclarationPageContext,
    value: {
      ContextualDeclarationHeader: DeclarationHeaderNormalStory,
    },
  },
});

const NotFoundStory = Template.bind({});
NotFoundStory.args = {
  ...commonComponentProps,
};
NotFoundStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: false, noEvent: true })],
  },
};
NotFoundStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const NotFound = prepareStory(NotFoundStory, {
  childrenContext: {
    context: DeclarationPageContext,
    value: {
      ContextualDeclarationHeader: DeclarationHeaderNormalStory,
    },
  },
});

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...commonComponentProps,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...NormalStory.parameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsCollaboratorStory,
  childrenContext: {
    context: DeclarationPageContext,
    value: {
      ContextualDeclarationHeader: DeclarationHeaderNormalStory,
    },
  },
});
