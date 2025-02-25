import { CustomError as LibraryCustomError } from 'ts-custom-error';

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

// The logged errors (console or API) are written by default in english (but will take french if english not filled)
// but the displayer/frontend is able to translate the content thanks to the error code
const { t } = getServerTranslation('common', {
  lng: 'en',
});

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
export const phoneCombinationInvalidError = new BusinessError('phoneCombinationInvalid', t('errors.validation.phone.phoneCombinationInvalid'));
export const phoneCombinationInvalidWithLeadingZeroWarningError = new BusinessError(
  'phoneCombinationInvalidWithLeadingZeroWarning',
  t('errors.validation.phone.phoneCombinationInvalidWithLeadingZeroWarning')
);
export const phoneInvalidError = new BusinessError('phoneInvalid', t('errors.validation.phone.phoneInvalid'));
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
export const noValidTicketingSystemError = new BusinessError('noValidTicketingSystem', t('errors.custom.noValidTicketingSystem'));
export const anotherTicketingSystemSynchronizationOngoingError = new BusinessError(
  'anotherTicketingSystemSynchronizationOngoing',
  t('errors.custom.anotherTicketingSystemSynchronizationOngoing')
);
export const missingBilletwebEventsRightsError = new BusinessError('missingBilletwebEventsRights', t('errors.custom.missingBilletwebEventsRights'));

// Event serie
export const eventSerieNotFoundError = new BusinessError('eventSerieNotFound', t('errors.custom.eventSerieNotFound'));

// Event category tickets
export const eventCategoryTicketsNotFoundError = new BusinessError('eventCategoryTicketsNotFound', t('errors.custom.eventCategoryTicketsNotFound'));

// Declaration
export const duplicateFluxEntryCategoryLabelError = new BusinessError(
  'duplicateFluxEntryCategoryLabel',
  t('errors.validation.accountingEntries.duplicateFluxEntryCategoryLabel')
);
export const duplicateEntryCategoryLabelError = new BusinessError(
  'duplicateEntryCategoryLabel',
  t('errors.validation.accountingEntries.duplicateEntryCategoryLabel')
);
