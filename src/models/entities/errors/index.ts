import { CustomError as LibraryCustomError } from 'ts-custom-error';
import { z } from 'zod';

import { getServerTranslation } from '@ad/src/i18n';

export class CustomError extends LibraryCustomError {
  public constructor(
    public readonly code: string,
    message: string = ''
  ) {
    super(message);
  }

  public json(): object {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class UnexpectedError extends CustomError {}

export class BusinessError extends CustomError {
  public constructor(
    code: string,
    message: string = '',
    public readonly httpCode?: number
  ) {
    super(code, message);
  }

  public cloneWithHttpCode(httpCode: number): BusinessError {
    return new BusinessError(this.code, this.message, httpCode);
  }
}

export class BusinessZodError extends BusinessError {
  public constructor(
    businessError: BusinessError,
    public zodError: z.core.$ZodIssue[],
    public readonly httpCode?: number
  ) {
    super(businessError.code, businessError.message);
  }

  public cloneWithHttpCode(httpCode: number): BusinessError {
    return new BusinessZodError(new BusinessError(this.code, this.message), this.zodError, httpCode);
  }

  public json(): object {
    return {
      code: this.code,
      message: this.message,
      zodError: this.zodError,
    };
  }
}

// The logged errors (console or API) are written by default in english (but will take french if english not filled)
// but the displayer/frontend is able to translate the content thanks to the error code
const { t } = getServerTranslation('common', {
  lng: 'en',
});

// Factorize the message when using `ctx.issues.push()` where the input is expected
// Note: passing `undefined` could lead to more complicated debugging
export const inputReplacementForSensitiveData = { _internal: 'the original input for this validation is masked due to being sensitive' };

//
// Errors definition
//

// General
export const internalServerErrorError = new UnexpectedError('internalServerError', 'internal server error');
export const unexpectedErrorError = new UnexpectedError('unexpectedError', 'unexpected error');
export const programRequestedToShutDownError = new UnexpectedError('programRequestedToShutDown', 'the program has been requested to shut down error');
export const promiseTimeoutError = new UnexpectedError('promiseTimeout', 'promise considered as timed out');

// Validations
export const unexpectedCliMaintenanceCommandError = new BusinessError(
  'unexpectedCliMaintenanceCommand',
  'unexpected command passed for maintenance through cli'
);
export const passwordRequiresANumericError = new BusinessError(
  'passwordRequiresANumeric',
  t('errors.validation.newPassword.passwordRequiresANumeric')
);
export const passwordRequiresHeightCharactersError = new BusinessError(
  'passwordRequiresHeightCharacters',
  t('errors.validation.newPassword.passwordRequiresHeightCharacters')
);
export const passwordRequiresLowerAndUpperCharactersError = new BusinessError(
  'passwordRequiresLowerAndUpperCharacters',
  t('errors.validation.newPassword.passwordRequiresLowerAndUpperCharacters')
);
export const passwordRequiresASpecialCharactersError = new BusinessError(
  'passwordRequiresASpecialCharacters',
  t('errors.validation.newPassword.passwordRequiresASpecialCharacters')
);
export const countryInvalidError = new BusinessError('countryInvalid', t('errors.validation.address.countryCode.countryInvalid'));

// File management
export const fileNotFoundError = new BusinessError('fileNotFound', t('errors.custom.fileNotFound'));

// Authentication
export const authCredentialsRequiredError = new BusinessError('authCredentialsRequired', t('errors.custom.authCredentialsRequired'));
export const authNoCredentialsMatchError = new BusinessError('authNoCredentialsMatch', t('errors.custom.authNoCredentialsMatch'));
export const authRetriableError = new BusinessError('authRetriable', t('errors.custom.authRetriable'));
export const authFatalError = new BusinessError('authFatal', t('errors.custom.authFatal'));
export const unauthorizedError = new BusinessError('unauthorizedError', t('errors.custom.unauthorizedError'));
export const userNotConfirmedError = new BusinessError('userNotConfirmed', t('errors.custom.userNotConfirmed'));

// Access
export const organizationCollaboratorRoleRequiredError = new BusinessError(
  'organizationCollaboratorRoleRequired',
  t('errors.custom.organizationCollaboratorRoleRequired')
);

// Sign up
export const accountAlreadyWithThisEmailError = new BusinessError('accountAlreadyWithThisEmail', t('errors.custom.accountAlreadyWithThisEmail'));

// Confirm sign up
export const userAlreadyConfirmedError = new BusinessError('userAlreadyConfirmed', t('errors.custom.userAlreadyConfirmed'));
export const wrongConfirmationTokenError = new BusinessError('wrongConfirmationToken', t('errors.custom.wrongConfirmationToken'));
export const expiredConfirmationTokenError = new BusinessError('expiredConfirmationToken', t('errors.custom.expiredConfirmationToken'));

// Request new password
export const noAccountWithThisEmailError = new BusinessError('noAccountWithThisEmail', t('errors.custom.noAccountWithThisEmail'));

// Reset password
export const invalidVerificationTokenError = new BusinessError('invalidVerificationToken', t('errors.custom.invalidVerificationToken'));
export const expiredVerificationTokenError = new BusinessError('expiredVerificationToken', t('errors.custom.expiredVerificationToken'));

// Change password
export const invalidCurrentPasswordError = new BusinessError('invalidCurrentPassword', t('errors.custom.invalidCurrentPassword'));

// User
export const userNotFoundError = new BusinessError('userNotFound', t('errors.custom.userNotFound'));

// Organization
export const officialIdMustBe9DigitsError = new BusinessError('officialIdMustBe9Digits', t('errors.validation.officialId.officialIdMustBe9Digits'));
export const officialIdHeadquartersMustBe14DigitsError = new BusinessError(
  'officialIdHeadquartersMustBe14Digits',
  t('errors.validation.officialHeadquartersId.officialHeadquartersIdMustBe14Digits')
);
export const sacemIdMustBeDigitsError = new BusinessError('sacemIdMustBeDigits', t('errors.validation.sacemId.sacemIdMustBeDigits'));
export const sacdIdMustBeDigitsError = new BusinessError('sacdIdMustBeDigits', t('errors.validation.sacdId.sacdIdMustBeDigits'));
export const anotherOrganizationAlreadyHasThisOfficialIdError = new BusinessError(
  'anotherOrganizationAlreadyHasThisOfficialId',
  t('errors.custom.anotherOrganizationAlreadyHasThisOfficialId')
);
export const multipleUserOrganizationsCreationError = new BusinessError(
  'multipleUserOrganizationsCreation',
  t('errors.custom.multipleUserOrganizationsCreation')
);
export const organizationMaskedAddressError = new BusinessError('organizationMaskedAddress', t('errors.custom.organizationMaskedAddress'));
export const organizationNotFoundError = new BusinessError('organizationNotFound', t('errors.custom.organizationNotFound'));
export const collaboratorCanOnlySeeOrganizationEventsSeriesError = new BusinessError(
  'collaboratorCanOnlySeeOrganizationEventsSeries',
  t('errors.custom.collaboratorCanOnlySeeOrganizationEventsSeries')
);
export const collaboratorCanOnlySeeOrganizationTicketingSystemsError = new BusinessError(
  'collaboratorCanOnlySeeOrganizationTicketingSystems',
  t('errors.custom.collaboratorCanOnlySeeOrganizationTicketingSystems')
);

// Ticketing system
export const ticketingSystemConnectionFailedError = new BusinessError(
  'ticketingSystemConnectionFailed',
  t('errors.custom.ticketingSystemConnectionFailed')
);
export const ticketingSystemNotFoundError = new BusinessError('ticketingSystemNotFound', t('errors.custom.ticketingSystemNotFound'));
export const alreadyExistingTicketingSystemError = new BusinessError(
  'alreadyExistingTicketingSystem',
  t('errors.custom.alreadyExistingTicketingSystem')
);
export const tooManyOrganizationTicketingSystemsError = new BusinessError(
  'tooManyOrganizationTicketingSystems',
  t('errors.custom.tooManyOrganizationTicketingSystems')
);
export const noValidTicketingSystemError = new BusinessError('noValidTicketingSystem', t('errors.custom.noValidTicketingSystem'));
export const anotherTicketingSystemSynchronizationOngoingError = new BusinessError(
  'anotherTicketingSystemSynchronizationOngoing',
  t('errors.custom.anotherTicketingSystemSynchronizationOngoing')
);
export const missingBilletwebEventsRightsError = new BusinessError('missingBilletwebEventsRights', t('errors.custom.missingBilletwebEventsRights'));
export const billetwebFirewallError = new BusinessError('billetwebFirewall', t('errors.custom.billetwebFirewall'));
export const foreignTaxRateOnPriceError = new BusinessError('foreignTaxRateOnPrice', t('errors.custom.foreignTaxRateOnPrice'));
export const supersoniksAccessKeyInvalidDomainNameError = new BusinessError(
  'supersoniksAccessKeyInvalidDomainName',
  t('errors.custom.supersoniksAccessKeyInvalidDomainName')
);
export const helloassoMissingTierError = new BusinessError('helloassoMissingTier', t('errors.custom.helloassoMissingTier'));
export const shotgunTooMuchToRetrieveError = new BusinessError('shotgunTooMuchToRetrieve', t('errors.custom.shotgunTooMuchToRetrieve'));

// Event serie
export const eventSerieNotFoundError = new BusinessError('eventSerieNotFound', t('errors.custom.eventSerieNotFound'));
export const eventSeriePartialExpensesGreatherThanTotalError = new BusinessError(
  'eventSeriePartialExpensesGreatherThanTotal',
  t('errors.custom.eventSeriePartialExpensesGreatherThanTotal')
);

// Place
export const placeAddressRequiredIfAnyNameSpecifiedError = new BusinessError(
  'placeAddressRequiredIfAnyNameSpecified',
  t('errors.custom.placeAddressRequiredIfAnyNameSpecified')
);
export const placeNameRequiredIfAnyAddressSpecifiedError = new BusinessError(
  'placeNameRequiredIfAnyAddressSpecified',
  t('errors.custom.placeNameRequiredIfAnyAddressSpecified')
);

// Declaration
export const transmittedDeclarationCannotBeUpdatedError = new BusinessError(
  'transmittedDeclarationCannotBeUpdated',
  t('errors.custom.transmittedDeclarationCannotBeUpdated')
);
export const atLeastOneTransmissionHasFailedError = new BusinessError(
  'atLeastOneTransmissionHasFailed',
  t('errors.custom.atLeastOneTransmissionHasFailed')
);
export const atLeastOneDeclarationTypeToTransmitError = new BusinessError(
  'atLeastOneDeclarationTypeToTransmit',
  t('errors.custom.atLeastOneDeclarationTypeToTransmit')
);
export const atLeastOneEventToTransmitError = new BusinessError('atLeastOneEventToTransmit', t('errors.custom.atLeastOneEventToTransmit'));
export const invalidDeclarationFieldsToTransmitError = new BusinessError(
  'invalidDeclarationFieldsToTransmit',
  t('errors.custom.invalidDeclarationFieldsToTransmit')
);
export const sacemAgencyNotFoundError = new BusinessError('sacemAgencyNotFound', t('errors.custom.sacemAgencyNotFound'));
export const sacemDeclarationUnsuccessfulError = new BusinessError('sacemDeclarationUnsuccessful', t('errors.custom.sacemDeclarationUnsuccessful'));
export const sacdDeclarationIncorrectDeclarantError = new BusinessError(
  'sacdDeclarationIncorrectDeclarant',
  t('errors.custom.sacdDeclarationIncorrectDeclarant')
);
export const sacdDeclarationUnsuccessfulError = new BusinessError('sacdDeclarationUnsuccessful', t('errors.custom.sacdDeclarationUnsuccessful'));
