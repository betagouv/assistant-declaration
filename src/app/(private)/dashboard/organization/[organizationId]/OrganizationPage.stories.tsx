import { Meta, StoryFn } from '@storybook/react';

import { ComponentProps, StoryHelperFactory } from '@ad/.storybook/helpers';
import { playFindButton } from '@ad/.storybook/testing';
import { AsCollaborator as PrivateLayoutAsCollaboratorStory } from '@ad/src/app/(private)/PrivateLayout.stories';
import { OrganizationPage } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/OrganizationPage';
import { organizations } from '@ad/src/fixtures/organization';
import { OrganizationSchema } from '@ad/src/models/entities/organization';
import { getTRPCMock } from '@ad/src/server/mock/trpc';

type ComponentType = typeof OrganizationPage;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Pages/Organization',
  component: OrganizationPage,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      getTRPCMock({
        type: 'query',
        path: ['getOrganization'],
        response: {
          organization: OrganizationSchema.parse(organizations[0]),
        },
      }),
    ],
  },
};

const commonComponentProps: ComponentProps<ComponentType> = {
  params: {
    organizationId: 'b79cb3ba-745e-5d9a-8903-4a02327a7e01',
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <OrganizationPage {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  ...commonComponentProps,
};
NormalStory.parameters = {
  ...defaultMswParameters,
};
NormalStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const Normal = prepareStory(NormalStory);

const WithLayoutStory = Template.bind({});
WithLayoutStory.args = {
  ...commonComponentProps,
};
WithLayoutStory.parameters = {
  layout: 'fullscreen',
  ...defaultMswParameters,
};
WithLayoutStory.play = async ({ canvasElement }) => {
  await playFindButton(canvasElement, /synchroniser/i);
};

export const WithLayout = prepareStory(WithLayoutStory, {
  layoutStory: PrivateLayoutAsCollaboratorStory,
});
