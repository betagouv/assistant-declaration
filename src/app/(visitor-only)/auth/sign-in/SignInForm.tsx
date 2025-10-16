'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { PasswordInput } from '@codegouvfr/react-dsfr/blocks/PasswordInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mutex } from 'locks';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SignInPrefillSchemaType, SignInSchema, SignInSchemaType } from '@ad/src/models/actions/auth';
import {
  BusinessError,
  UnexpectedError,
  authCredentialsRequiredError,
  authFatalError,
  authNoCredentialsMatchError,
  authRetriableError,
  internalServerErrorError,
  userNotConfirmedError,
} from '@ad/src/models/entities/errors';
import { signIn } from '@ad/src/proxies/next-auth/react';
import { linkRegistry } from '@ad/src/utils/routes/registry';

function errorCodeToError(errorCode: string): BusinessError | UnexpectedError {
  let error: BusinessError | UnexpectedError;

  switch (errorCode) {
    case authCredentialsRequiredError.code:
      error = authCredentialsRequiredError;
      break;
    case authNoCredentialsMatchError.code:
      error = authNoCredentialsMatchError;
      break;
    case userNotConfirmedError.code:
      error = userNotConfirmedError;
      break;
    case 'undefined':
      // Probably the server has thrown something that is not a basic `Error` object
      error = internalServerErrorError;
      break;
    default:
      error = authRetriableError;
      break;
  }

  return error;
}

export function SignInForm({ prefill }: { prefill?: SignInPrefillSchemaType }) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const confirmSignUp = trpc.confirmSignUp.useMutation();

  const searchParams = useSearchParams();
  const callbackUrl = searchParams!.get('callbackUrl');
  const attemptErrorCode = searchParams!.get('error');
  const loginHint = searchParams!.get('login_hint');
  const sessionEnd = searchParams!.has('session_end');
  const confirmationToken = searchParams!.get('token');

  const [showSessionEndBlock, setShowSessionEndBlock] = useState<boolean>(sessionEnd);
  const [showConfirmedBlock, setShowConfirmedBlock] = useState<boolean>(false);

  const [readyToDisplay, setReadyToDisplay] = useState<boolean>(false);
  const [confirmSignUpError, setConfirmSignUpError] = useState<Error | null>(null);

  const [error, setError] = useState<BusinessError | UnexpectedError | null>(() => {
    return attemptErrorCode ? errorCodeToError(attemptErrorCode) : null;
  });
  const [mutex] = useState<Mutex>(new Mutex());
  const formContainerRef = useRef<HTMLFormElement | null>(null); // This is used to scroll to the error messages

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<SignInSchemaType>({
    resolver: zodResolver(SignInSchema),
    defaultValues: prefill ?? {
      email: loginHint ?? undefined,
    },
  });

  // We have to use an unicity check because in development React is using the strict mode
  // and renders the component twice. Due to this we also cannot use `useState(() => false)` because the 2 renders
  // are totally distincts. Having 2 copy actions at the same time is breaking having HTML part into the clipboard (whereas the text part stays)
  const triedToConfirmdRef = useRef(false);

  useEffect(() => {
    if (confirmationToken && !triedToConfirmdRef.current) {
      triedToConfirmdRef.current = true;

      const a = confirmSignUp
        .mutateAsync({
          token: confirmationToken,
        })
        .then(async () => {
          setShowConfirmedBlock(true);
        })
        .catch((error) => {
          setConfirmSignUpError(error);
        })
        .finally(() => {
          setReadyToDisplay(true);
        });
    } else {
      setReadyToDisplay(true);
    }
  }, [confirmationToken, confirmSignUp]);

  const enhancedHandleSubmit: typeof handleSubmit = (...args) => {
    // Hide messages set by any query parameter (we trying replacing the URL to remove them but it takes around 200ms, it was not smooth enough)
    setShowSessionEndBlock(false);
    setShowConfirmedBlock(false);
    setConfirmSignUpError(null);

    return handleSubmit(...args);
  };

  const onSubmit = async ({ email, password, rememberMe }: any) => {
    // If it's already running, quit
    if (!mutex.tryLock()) {
      return;
    }

    try {
      const result = await signIn(
        'credentials',
        {
          redirect: false,
          callbackUrl: callbackUrl || undefined,
          email,
          password,
        },
        {
          prompt: rememberMe === true ? 'none' : 'login',
          login_hint: email,
        }
      );

      if (result && !result.ok && result.error) {
        setError(errorCodeToError(result.error));
        formContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else if (result && result.ok && result.url) {
        setError(null);

        router.push(result.url);
      } else if (result && result.ok) {
        setError(null);

        router.push(linkRegistry.get('dashboard', undefined));
      } else {
        setError(authFatalError);
        formContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } finally {
      // Unlock to allow a new submit
      mutex.unlock();
    }
  };

  if (!readyToDisplay) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  }

  return (
    <BaseForm handleSubmit={enhancedHandleSubmit} onSubmit={onSubmit} control={control} ariaLabel="se connecter" innerRef={formContainerRef}>
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          {(!!error || !!confirmSignUpError || showSessionEndBlock || showConfirmedBlock) && (
            <div className={fr.cx('fr-fieldset__element')}>
              {!!error && <ErrorAlert errors={[error]} />}
              {!!confirmSignUpError && <ErrorAlert errors={[confirmSignUpError]} />}
              {showSessionEndBlock && <Alert severity="success" small={false} title="Succès" description="Vous avez bien été déconnecté" />}
              {showConfirmedBlock && (
                <Alert
                  severity="success"
                  small={false}
                  title="Succès"
                  description="Votre inscription est finalisée, vous pouvez dès à présent vous connecter pour accéder au tableau de bord."
                />
              )}
            </div>
          )}
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Email"
              state={!!errors.email ? 'error' : undefined}
              stateRelatedMessage={errors?.email?.message}
              nativeInputProps={{
                type: 'email',
                ...register('email'),
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <PasswordInput
              label="Mot de passe"
              messages={errors?.password ? [{ severity: 'error', message: errors?.password?.message }] : []}
              nativeInputProps={{
                ...register('password'),
                autoComplete: 'current-password',
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')} style={{ display: 'none' }}>
            <Checkbox
              options={[
                {
                  label: 'Se souvenir de moi',
                  nativeInputProps: {
                    ...register('rememberMe'),
                    value: 'true',
                  },
                },
              ]}
              state={!!errors.rememberMe ? 'error' : undefined}
              stateRelatedMessage={errors?.rememberMe?.message}
              small
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={mutex.isLocked}>
                  Se connecter
                </Button>
              </li>
            </ul>
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <NextLink href={linkRegistry.get('forgottenPassword', undefined)} className={fr.cx('fr-link')}>
              Mot de passe oublié ?
            </NextLink>
          </div>
        </fieldset>
        <hr />
        <h2 className={fr.cx('fr-h4')}>Vous n&apos;avez pas de compte ?</h2>
        <ul className={fr.cx('fr-btns-group')}>
          <li>
            <NextLink href={linkRegistry.get('signUp', undefined)} className={fr.cx('fr-btn', 'fr-btn--secondary')}>
              Créer un compte
            </NextLink>
          </li>
        </ul>
      </div>
    </BaseForm>
  );
}
