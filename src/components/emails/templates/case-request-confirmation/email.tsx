import { MjmlDivider, MjmlText } from '@faire/mjml-react';
import addressFormatter from '@fragaria/address-formatter';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

import { StandardLayout } from '@ad/src/components/emails/layouts/standard';
import { convertInputModelToGooglePhoneNumber } from '@ad/src/components/utils/phone';
import { useServerTranslation } from '@ad/src/i18n/index';
import { RequestCaseSchemaType } from '@ad/src/models/actions/case';

const phoneNumberUtil = PhoneNumberUtil.getInstance();

export function formatTitle() {
  return `Demande de médiation reçue`;
}

export function formatListHeader(header: string) {
  return <span style={{ fontWeight: 'bold' }}>{header}</span>;
}

export interface CaseRequestConfirmationEmailProps {
  firstname: string;
  lastname: string;
  caseHumanId: string;
  authorityName: string;
  submittedRequestData: RequestCaseSchemaType;
}

export function CaseRequestConfirmationEmail(props: CaseRequestConfirmationEmailProps) {
  const { t } = useServerTranslation('common');
  const title = formatTitle();

  return (
    <StandardLayout title={title}>
      <MjmlText>
        <h1>{title}</h1>
        <p>
          {props.firstname} {props.lastname},
        </p>
        <p>
          Nous vous informons que la demande de médiation que vous venez de déposer a bien été prise en compte sous le numéro de dossier{' '}
          {props.caseHumanId}.
        </p>
      </MjmlText>
      {props.submittedRequestData.emailCopyWanted && (
        <>
          <MjmlDivider />
          <MjmlText>
            <p>
              Vous avez demandé à recevoir une copie des informations renseignées que vous trouverez ci-dessous :
              <ul>
                {!!props.submittedRequestData.email && (
                  <li>
                    {formatListHeader('Email :')} {props.submittedRequestData.email}
                  </li>
                )}
                {!!props.submittedRequestData.genderIdentity && (
                  <li>
                    {formatListHeader('Identité de genre :')}{' '}
                    {t(`model.citizen.genderIdentityPrefix.enum.${props.submittedRequestData.genderIdentity}`)}
                  </li>
                )}
                <li>
                  {formatListHeader('Prénom :')} {props.submittedRequestData.firstname}
                </li>
                <li>
                  {formatListHeader('Nom :')} {props.submittedRequestData.lastname}
                </li>
                {!!props.submittedRequestData.address && (
                  <li>
                    {formatListHeader('Adresse :')}{' '}
                    {addressFormatter.format({
                      street: props.submittedRequestData.address.street,
                      city: props.submittedRequestData.address.city,
                      postcode: props.submittedRequestData.address.postalCode,
                      state: props.submittedRequestData.address.subdivision,
                      countryCode: props.submittedRequestData.address.countryCode,
                    })}
                  </li>
                )}
                {!!props.submittedRequestData.phone && (
                  <li>
                    {formatListHeader('Téléphone :')}{' '}
                    {phoneNumberUtil.format(convertInputModelToGooglePhoneNumber(props.submittedRequestData.phone), PhoneNumberFormat.NATIONAL)}
                  </li>
                )}
                {props.submittedRequestData.alreadyRequestedInThePast !== null && (
                  <li>
                    <>
                      {formatListHeader('Premier recours déjà effectué :')}{' '}
                      {props.submittedRequestData.alreadyRequestedInThePast ? t('boolean.true') : t('boolean.false')}
                    </>
                  </li>
                )}
                {props.submittedRequestData.alreadyRequestedInThePast && props.submittedRequestData.gotAnswerFromPreviousRequest !== null && (
                  <li>
                    <>
                      {formatListHeader('Réponse suite au premier recours :')}{' '}
                      {props.submittedRequestData.gotAnswerFromPreviousRequest ? t('boolean.true') : t('boolean.false')}
                    </>
                  </li>
                )}
                <li>
                  {formatListHeader('Description :')} {props.submittedRequestData.description}
                </li>
                {/* TODO: add the number of attachments? Or their name? */}
              </ul>
            </p>
          </MjmlText>
        </>
      )}
    </StandardLayout>
  );
}
