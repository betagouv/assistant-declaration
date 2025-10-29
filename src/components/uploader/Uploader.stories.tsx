import { Meta, StoryFn } from '@storybook/react';
import { HttpResponse, delay, http } from 'msw';
import { within } from 'storybook/test';

import { StoryHelperFactory } from '@ad/.storybook/helpers';
import { Uploader } from '@ad/src/components/uploader/Uploader';
import { AttachmentKindSchema } from '@ad/src/models/entities/attachment';
import { mockBaseUrl } from '@ad/src/server/mock/environment';
import { attachmentKindList } from '@ad/src/utils/attachment';

type ComponentType = typeof Uploader;
const { generateMetaDefault, prepareStory } = StoryHelperFactory<ComponentType>();

export default {
  title: 'Components/Uploader',
  component: Uploader,
  ...generateMetaDefault({
    parameters: {},
  }),
} as Meta<ComponentType>;

const defaultMswParameters = {
  msw: {
    handlers: [
      http.post(`${mockBaseUrl}/api/upload`, (info) => {
        return new HttpResponse(null, {
          status: 201,
          headers: {
            'Access-Control-Expose-Headers':
              'Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With, X-Forwarded-Host, X-Forwarded-Proto, Forwarded',
            'Content-Length': '0',
            Location: `${mockBaseUrl}/api/upload/00000000-0000-0000-0000-000000000000`,
            'Tus-Resumable': '1.0.0',
          },
        });
      }),
      http.head(`${mockBaseUrl}/api/upload/:uploadId`, (info) => {
        return new HttpResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Expose-Headers':
              'Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With, X-Forwarded-Host, X-Forwarded-Proto, Forwarded',
            'Content-Length': '16171',
            'Upload-Offset': '36',
            'Upload-Length': '16171',
            'Upload-Metadata':
              'caption ,filename bG9sLmpwZw==,filetype aW1hZ2UvanBlZw==,name bG9sLmpwZw==,relativePath bnVsbA==,type aW1hZ2UvanBlZw==',
            'Tus-Resumable': '1.0.0',
          },
        });
      }),
      http.patch(`${mockBaseUrl}/api/upload/:uploadId`, async (info) => {
        await delay(1000); // Set a delay so the loader can be seen

        return new HttpResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Expose-Headers':
              'Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With, X-Forwarded-Host, X-Forwarded-Proto, Forwarded',
            'Upload-Offset': '16171',
            'Tus-Resumable': '1.0.0',
          },
        });
      }),
      http.options(`${mockBaseUrl}/api/upload/:uploadId`, (info) => {
        return new HttpResponse(null, {
          status: 200,
          headers: {
            'Content-Type': 'application/offset+octet-stream',
            'Upload-Offset': '0',
            'Tus-Resumable': '1.0.0',
          },
        });
      }),
      http.delete(`${mockBaseUrl}/api/upload/:uploadId`, (info) => {
        return new HttpResponse(null, {
          status: 204,
          headers: {
            'Access-Control-Expose-Headers':
              'Authorization, Content-Type, Location, Tus-Extension, Tus-Max-Size, Tus-Resumable, Tus-Version, Upload-Concat, Upload-Defer-Length, Upload-Length, Upload-Metadata, Upload-Offset, X-HTTP-Method-Override, X-Requested-With, X-Forwarded-Host, X-Forwarded-Proto, Forwarded',
            'Content-Length': '0',
            'Tus-Resumable': '1.0.0',
          },
        });
      }),
    ],
  },
};

const Template: StoryFn<ComponentType> = (args) => {
  return <Uploader {...args} />;
};

const NormalStory = Template.bind({});
NormalStory.args = {
  attachmentKindRequirements: attachmentKindList[AttachmentKindSchema.enum.EVENT_SERIE_DOCUMENT],
  maxFiles: 1,
};
NormalStory.parameters = { ...defaultMswParameters };
NormalStory.play = async ({ canvasElement }) => {
  await within(canvasElement).findByRole('button');
};

export const Normal = prepareStory(NormalStory);
