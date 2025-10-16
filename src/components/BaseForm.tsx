import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { DevTool } from '@hookform/devtools';
import * as Sentry from '@sentry/nextjs';
import { Mutex } from 'locks';
import { CSSProperties, FormEventHandler, MutableRefObject, PropsWithChildren, useMemo, useRef, useState } from 'react';
import { Control, FieldError, FieldErrorsImpl, FieldValues, Merge, UseFormHandleSubmit } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { BusinessError } from '@ad/src/models/entities/errors';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { recursiveCountErrors } from '@ad/src/utils/validation';

export interface BaseFormProps<FormSchemaType extends FieldValues> {
  handleSubmit: UseFormHandleSubmit<FormSchemaType>;
  onSubmit: (input: FormSchemaType) => Promise<void>;
  control: Control<any>;
  ariaLabel: string;
  style?: CSSProperties;
  innerRef?: MutableRefObject<HTMLFormElement | null>;
}

// When you want to debug a form, just uncomment the below line (I did not see the value to manage it through environment variable)
export function BaseForm<FormSchemaType extends FieldValues>(props: PropsWithChildren<BaseFormProps<FormSchemaType>>) {
  const { t } = useTranslation('common');
  const [validationErrors, setValidationErrors] = useState<FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined>(
    props.control._formState.errors
  );
  const [onSubmitError, setOnSubmitError] = useState<Error | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null); // This is used to scroll to the error messages
  const [mutex] = useState<Mutex>(new Mutex());

  const validationErrorsCount = useMemo(() => {
    // Since it can be nested with objects or arrays we make sure analyzing all cases
    return recursiveCountErrors(validationErrors);
  }, [validationErrors]);

  const setMultipleRefs = (element: HTMLFormElement) => {
    formRef.current = element;

    if (props.innerRef) {
      props.innerRef.current = element;
    }
  };

  // Some forms in dialogs need to force stopping submit propagation leakage on parent forms
  const onSubmit: FormEventHandler<HTMLFormElement> = async (...args) => {
    // If it's already running, quit
    if (!mutex.tryLock()) {
      args[0].preventDefault();
      return;
    }

    try {
      const submitChain = props.handleSubmit(
        async (input: FormSchemaType) => {
          try {
            // Validation has passed, reset validation errors
            setValidationErrors({});

            await props.onSubmit(input);

            setOnSubmitError(null);
          } catch (err: unknown) {
            if (err instanceof Error) {
              setOnSubmitError(err);
            } else {
              setOnSubmitError(err as any); // The default case is good enough for now
            }

            // If not from the server it means in case of a none business error it has not been reported (and will not be due to this catch), so doing it
            if (!(err instanceof Error && err.name === 'TRPCClientError') && !(err instanceof BusinessError)) {
              Sentry.captureException(err);
            }

            formRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
        },
        (errors) => {
          // Reset previous error from business code
          setOnSubmitError(null);

          // Only triggered on inputs validation errors
          setValidationErrors(errors);

          formRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      );

      await submitChain.apply(null, args);
    } finally {
      // Unlock to allow a new submit
      mutex.unlock();
    }
  };

  return (
    <>
      {/* <DevTool control={props.control} /> */}

      <form onSubmit={onSubmit} aria-label={props.ariaLabel} style={props.style} ref={setMultipleRefs}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')}>
          {!!onSubmitError && (
            <div className={fr.cx('fr-col-12', 'fr-py-4v')}>
              <ErrorAlert errors={[onSubmitError]} />
            </div>
          )}

          {validationErrorsCount > 0 && (
            <div className={fr.cx('fr-col-12', 'fr-py-4v')}>
              <Alert
                severity="error"
                small={false}
                title="Une erreur est survenue"
                description={
                  validationErrors && '' in validationErrors
                    ? capitalizeFirstLetter(validationErrors['']?.message as string) // Uppercase first letter since our errors are lowercase by default for flexibility
                    : t('components.BaseForm.form_contains_errors', { count: validationErrorsCount })
                }
              />
            </div>
          )}

          {props.children}
        </div>
      </form>
    </>
  );
}
