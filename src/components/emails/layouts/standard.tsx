import {
  Mjml,
  MjmlAll,
  MjmlAttributes,
  MjmlBody,
  MjmlButton,
  MjmlColumn,
  MjmlDivider,
  MjmlGroup,
  MjmlHead,
  MjmlImage,
  MjmlPreview,
  MjmlRaw,
  MjmlSection,
  MjmlSocial,
  MjmlSocialElement,
  MjmlStyle,
  MjmlText,
  MjmlTitle,
  MjmlWrapper,
} from '@faire/mjml-react';
import { PropsWithChildren } from 'react';

import emailCss from '@ad/src/components/emails/layouts/standard.email.scss?raw';
import storybookCss from '@ad/src/components/emails/layouts/standard.storybook.scss?raw';
import { getBaseUrl } from '@ad/src/utils/url';

// We avoided using React context hook here for simplicity
const isStorybookEnvironment: boolean = process.env.STORYBOOK_ENVIRONMENT === 'true';

const emailCssWithAdjustedUrls = isStorybookEnvironment ? emailCss : emailCss.replace(/\/assets\//g, `${getBaseUrl()}/assets/`);

export const quotedReplyMarkerClass: string = 'quoted-reply-marker';

export interface StandardLayoutProps {
  title: string;
}

export function StandardLayout(props: PropsWithChildren<StandardLayoutProps>) {
  const currentYear = new Date().getFullYear();

  return (
    <Mjml>
      <MjmlHead>
        <MjmlTitle>{props.title}</MjmlTitle>
        {/* TODO: the preview can be interesting but it would add transpiling the context one more time and convert the html to plaintext to keep only the first valuable line (not the "Hello Thomas,"...) (ref: https://www.litmus.com/blog/the-ultimate-guide-to-preview-text-support) */}
        {/* <MjmlPreview>{props.title}</MjmlPreview> */}
        <MjmlAttributes>
          <MjmlSection padding="10px 0px"></MjmlSection>
          <MjmlColumn padding="0px 0px"></MjmlColumn>
          <MjmlDivider css-class="divider" border-width="1px" border-color="#000000"></MjmlDivider>
          <MjmlAll fontFamily='"Marianne", arial, sans-serif'></MjmlAll>
          <MjmlText cssClass="light-text" color="#3a3a3a" fontSize="14px" lineHeight="24px"></MjmlText>
          <MjmlButton
            backgroundColor="#000091"
            borderRadius="0px"
            cssClass="light-button"
            color="#f5f5fe"
            fontSize={16}
            fontWeight={400}
            lineHeight="24px"
            padding="8px 16px"
          ></MjmlButton>
        </MjmlAttributes>
        <MjmlStyle>{isStorybookEnvironment ? storybookCss : emailCssWithAdjustedUrls}</MjmlStyle>
        <MjmlRaw>
          {!isStorybookEnvironment && (
            <>
              <meta name="color-scheme" content="light dark" />
              <meta name="supported-color-schemes" content="light dark" />
            </>
          )}
        </MjmlRaw>
      </MjmlHead>
      <MjmlBody width={500}>
        <MjmlWrapper cssClass={`light-body ${quotedReplyMarkerClass}`}>
          <MjmlSection>
            <MjmlGroup>
              <MjmlColumn cssClass="logo-section" verticalAlign="middle" width="24%">
                {/* `MjmlColumn` width must be a percentage (ref: https://github.com/mjmlio/mjml/issues/2489) */}
                {/* TODO: upload images on our own CDN, or use public folder of the app... */}
                <MjmlImage src={`${getBaseUrl()}/assets/images/logo.png#${quotedReplyMarkerClass}`} alt="logo" paddingRight={0} />
              </MjmlColumn>
              <MjmlColumn verticalAlign="middle" width="76%">
                <MjmlText fontSize={20} fontWeight={700} paddingBottom={2}>
                  Médiature
                </MjmlText>
                <MjmlText fontSize={16} paddingTop={2}>
                  Service public de médiation
                </MjmlText>
              </MjmlColumn>
            </MjmlGroup>
          </MjmlSection>
          <MjmlSection cssClass="light-main-section" backgroundColor="#f6f6f6">
            <MjmlGroup>
              <MjmlColumn>{props.children}</MjmlColumn>
            </MjmlGroup>
          </MjmlSection>
          <MjmlSection>
            <MjmlGroup>
              <MjmlColumn>
                <MjmlText align="center" color="#666666" fontSize={12} paddingTop={2} paddingBottom={0}>
                  {currentYear} © Médiature
                </MjmlText>
                <MjmlSocial cssClass="social-network-section" fontSize="15px" iconSize="30px" mode="horizontal" borderRadius={20} paddingTop={2}>
                  {/* We took images from https://www.mailjet.com/images/theme/v1/icons/ico-social/twitter.png (change `twitter` for others) to host them ourselves since adblockers may block images otherwise */}
                  <MjmlSocialElement
                    name="twitter"
                    href="https://twitter.com/AmctMediation"
                    src={`${getBaseUrl()}/assets/images/email/social/twitter.png`}
                    alt="Lien vers Twitter"
                    iconPadding="5px"
                    padding="6px 6px"
                  ></MjmlSocialElement>
                  <MjmlSocialElement
                    name="linkedin"
                    href="https://www.linkedin.com/company/association-des-m%C3%A9diateurs-des-collectivit%C3%A9s-territoriales"
                    src={`${getBaseUrl()}/assets/images/email/social/linkedin.png`}
                    alt="Lien vers LinkedIn"
                    iconPadding="5px"
                    padding="0px 10px"
                  ></MjmlSocialElement>
                </MjmlSocial>
              </MjmlColumn>
            </MjmlGroup>
          </MjmlSection>
        </MjmlWrapper>
      </MjmlBody>
    </Mjml>
  );
}
