import { fr } from '@codegouvfr/react-dsfr';
import { Alert, AlertProps } from '@codegouvfr/react-dsfr/Alert';
import { Button } from '@codegouvfr/react-dsfr/Button';
import { TRPCClientErrorLike } from '@trpc/client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import z, { ZodIssue } from 'zod';

import { formatMessageFromIssue } from '@ad/src/i18n';
import { CustomError, internalServerErrorError, unexpectedErrorError } from '@ad/src/models/entities/errors';
import { formatMessageFromCustomError } from '@ad/src/models/entities/errors/helpers';
import { AppRouter } from '@ad/src/server/app-router';
import { capitalizeFirstLetter } from '@ad/src/utils/format';

// import { QueryObserverResult, RefetchOptions } from '@tansack/query-core';

export interface ErrorAlertProps extends Pick<AlertProps, 'onClose' | 'style'> {
  errors: (TRPCClientErrorLike<AppRouter> | Error)[]; // Errors can be from the network (tRPC most of the time) or local
  // TODO: impossible to import types... why?
  // refetchs: (options?: RefetchOptions) => Promise<QueryObserverResult<unknown, unknown>>[];
  refetchs?: ((options?: any) => Promise<any>)[];
}

export function ErrorAlert(props: ErrorAlertProps) {
  const { t } = useTranslation('common');

  const { errors, containsRetriableServerError } = useMemo(() => {
    let containsRetriableServerError: boolean = false;
    let errs: string[] = [];
    for (const error of props.errors) {
      if (error instanceof Error && error.name === 'TRPCClientError') {
        const trpcError = error as unknown as TRPCClientErrorLike<AppRouter>;

        if (trpcError.data && 'zodError' in trpcError.data && Array.isArray(trpcError.data.zodError)) {
          // Format to benefit from all the typings
          const zodError = new z.ZodError(trpcError.data.zodError as ZodIssue[]);

          for (const issue of zodError.issues) {
            // As fallback display the error message from the server, should be good enough but can be in another language
            errs.push(formatMessageFromIssue(issue) || issue.message);
          }
        } else if (trpcError.data && 'customError' in trpcError.data && trpcError.data.customError !== null) {
          const customErrorPayload = trpcError.data.customError as CustomError;
          const customError = new CustomError(customErrorPayload.code, customErrorPayload.message);

          errs.push(formatMessageFromCustomError(customError) || customError.message);
        } else {
          // If not a validation error (`ZodError`), nor a business error (`BusinessError`), consider it as a server error that can be retried
          containsRetriableServerError = true;

          // The API is supposed to hide details so show internal server error translation
          errs.push(t(`errors.custom.${internalServerErrorError.code as 'internalServerError'}`));
        }
      } else if (error instanceof CustomError) {
        // Custom error can also occur from frontend directly
        errs.push(formatMessageFromCustomError(error) || error.message);
      } else {
        console.error(error);

        // The error is not formatted to be displayed so using a generic message
        errs.push(t(`errors.custom.${unexpectedErrorError.code as 'unexpectedError'}`));
      }
    }

    return {
      containsRetriableServerError,
      // Remove duplicates since it has no value
      // and uppercase the first letter of each since our errors are lowercase by default to combine them as we want
      errors: [...new Set(errs)].map((err) => capitalizeFirstLetter(err)),
    };
  }, [props.errors, t]);

  if (props.errors.length === 0) {
    return <></>;
  }

  const retry = props.refetchs
    ? ((refetchs: ((options?: any) => Promise<any>)[]) => {
        return async () => {
          await Promise.all(
            refetchs.map((refetch) => {
              return refetch();
            })
          );
        };
      })(props.refetchs)
    : null;

  return (
    <Alert
      {...({ role: 'alert' } as any)}
      severity="error"
      small={false}
      title="Erreur"
      description={
        <>
          {errors.length === 1 ? (
            <>{errors[0]}</>
          ) : (
            <>
              Plusieurs erreurs ont été rencontrées :
              <br />
              <ul>
                {errors.map((error) => {
                  return <li key={error}>{error}</li>;
                })}
              </ul>
            </>
          )}
          {retry && containsRetriableServerError && (
            <>
              <br />
              <Button onClick={retry} iconId="fr-icon-refresh-fill" className={fr.cx('fr-mt-4v', 'fr-mx-auto')} style={{ display: 'flex' }}>
                Réessayer
              </Button>
            </>
          )}
        </>
      }
      style={props.style || {}}
    />
  );
}
