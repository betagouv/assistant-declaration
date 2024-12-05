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
