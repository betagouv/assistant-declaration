import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { SacemDeclarationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacem/SacemDeclarationPage';
import { SacemDeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/sacem/SacemDeclarationPageContext';
import { Normal as DeclarationHeaderNormalStory } from '@ad/src/components/DeclarationHeader.stories';
import { sacemDeclarations, sacemDeclarationsWrappers } from '@ad/src/fixtures/declaration/sacem';
import { eventsSeries, eventsWrappers } from '@ad/src/fixtures/event';
import { DeclarationStatusSchema, DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof SacemDeclarationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/SacemDeclaration',
  component: SacemDeclarationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

function mswCommonParameters(options: { transmitted: boolean; noEvent: boolean }) {
  const adjustedSacemDeclaration = {
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
      path: ['getSacemDeclaration'],
      response: {
        sacemDeclarationWrapper: { ...sacemDeclarationsWrappers[0], declaration: adjustedSacemDeclaration },
      },
    }),
    getTRPCMock({
      type: 'mutation',
      path: ['fillSacemDeclaration'],
      response: {
        sacemDeclaration: adjustedSacemDeclaration,
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
  return <SacemDeclarationPage {...args} />;
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
    context: SacemDeclarationPageContext,
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
    context: SacemDeclarationPageContext,
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
    context: SacemDeclarationPageContext,
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
    context: SacemDeclarationPageContext,
    value: {
      ContextualDeclarationHeader: DeclarationHeaderNormalStory,
    },
  },
});
