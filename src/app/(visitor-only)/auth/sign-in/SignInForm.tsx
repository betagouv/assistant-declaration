'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton as Button } from '@mui/lab';
import {
  Alert,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { Mutex } from 'locks';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
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

  const [showPassword, setShowPassword] = useState(false);
  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = () => setShowPassword(!showPassword);

  if (!readyToDisplay) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  }

  return (
    <BaseForm handleSubmit={enhancedHandleSubmit} onSubmit={onSubmit} control={control} ariaLabel="se connecter" innerRef={formContainerRef}>
      {(!!error || !!confirmSignUpError || showSessionEndBlock || showConfirmedBlock) && (
        <Grid item xs={12}>
          {!!error && <ErrorAlert errors={[error]} />}
          {!!confirmSignUpError && <ErrorAlert errors={[confirmSignUpError]} />}
          {showSessionEndBlock && <Alert severity="success">Vous avez bien été déconnecté</Alert>}
          {showConfirmedBlock && (
            <Alert severity="success">
              Votre inscription est finalisée, vous pouvez dès à présent vous connecter pour accéder au tableau de bord.
            </Alert>
          )}
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField type="email" label="Email" {...register('email')} error={!!errors.email} helperText={errors?.email?.message} fullWidth />
      </Grid>
      <Grid item xs={12}>
        <TextField
          type={showPassword ? 'text' : 'password'}
          label="Mot de passe"
          {...register('password')}
          autoComplete="current-password"
          error={!!errors.password}
          helperText={errors?.password?.message}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="changer la visibilité du mot de passe"
                  onClick={handleClickShowPassword}
                  onMouseDown={handleMouseDownPassword}
                >
                  {showPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} sx={{ display: 'none' }}>
        <FormControl error={!!errors.rememberMe}>
          {/* TODO: really manage "rememberMe" */}
          <FormControlLabel label="Rester connecté" control={<Checkbox {...register('rememberMe')} defaultChecked />} />
          <FormHelperText>{errors?.rememberMe?.message}</FormHelperText>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <Button type="submit" loading={mutex.isLocked} size="large" variant="contained" fullWidth>
          Se connecter
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Typography color="textSecondary" variant="body2">
          <Link component={NextLink} href={linkRegistry.get('forgottenPassword', undefined)} variant="subtitle2" underline="none">
            Mot de passe oublié ?
          </Link>
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Divider variant="fullWidth" sx={{ p: 0, my: 1 }} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Vous n&apos;avez pas de compte ?
        </Typography>
        <Button
          component={NextLink}
          href={linkRegistry.get('signUp', undefined)}
          size="large"
          variant="outlined"
          fullWidth
          sx={{
            backgroundImage: 'none !important',
          }}
        >
          Créer un compte
        </Button>
      </Grid>
    </BaseForm>
  );
}
