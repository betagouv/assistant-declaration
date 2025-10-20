import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindMainTitle } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { DeclarationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPage';
import { declarations, declarationsWrappers } from '@ad/src/fixtures/declaration/common';
import { DeclarationStatusSchema } from '@ad/src/models/entities/common';
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

function mswCommonParameters(options: { transmitted: boolean; noEvent: boolean; transmissionError: boolean }) {
  const adjustedDeclaration = { ...declarationsWrappers[0].declaration, events: options.noEvent ? [] : declarationsWrappers[0].declaration.events };

  return [
    getTRPCMock({
      type: 'query',
      path: ['getDeclaration'],
      response: {
        declarationWrapper: {
          ...declarationsWrappers[0],
          declaration: adjustedDeclaration,
          transmissions:
            options.transmitted && !options.noEvent
              ? declarationsWrappers[0].declaration.eventSerie.expectedDeclarationTypes.map((declarationType) => {
                  return options.transmissionError
                    ? {
                        type: declarationType,
                        status: DeclarationStatusSchema.enum.PENDING,
                        hasError: true,
                      }
                    : {
                        type: declarationType,
                        status: DeclarationStatusSchema.enum.PROCESSED,
                        hasError: false,
                      };
                })
              : [],
        },
      },
    }),
    getTRPCMock({
      type: 'mutation',
      path: ['fillDeclaration'],
      response: {
        declaration: adjustedDeclaration,
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
    handlers: [...mswCommonParameters({ transmitted: false, noEvent: false, transmissionError: false })],
  },
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const Normal = prepareStory(NormalStory);

const TransmittedStory = Template.bind({});
TransmittedStory.args = {
  ...NormalStory.args,
};
TransmittedStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: true, noEvent: false, transmissionError: false })],
  },
};
TransmittedStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const Transmitted = prepareStory(TransmittedStory);

const ErroredTransmissionStory = Template.bind({});
ErroredTransmissionStory.args = {
  ...NormalStory.args,
};
ErroredTransmissionStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: true, noEvent: false, transmissionError: true })],
  },
};
ErroredTransmissionStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const ErroredTransmission = prepareStory(ErroredTransmissionStory);

const NotFoundStory = Template.bind({});
NotFoundStory.args = {
  ...commonComponentProps,
};
NotFoundStory.parameters = {
  msw: {
    handlers: [...mswCommonParameters({ transmitted: false, noEvent: true, transmissionError: false })],
  },
};
NotFoundStory.play = async ({ canvasElement }) => {
  await playFindMainTitle(canvasElement, /cracheur/i);
};

export const NotFound = prepareStory(NotFoundStory);

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
});
