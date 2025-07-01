'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Alert, Button, Grid, IconButton, InputAdornment, Link, MenuItem, TextField } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import {
  ConnectTicketingSystemPrefillSchemaType,
  ConnectTicketingSystemSchema,
  ConnectTicketingSystemSchemaType,
} from '@ad/src/models/actions/ticketing';
import { TicketingSystemNameSchema, TicketingSystemNameSchemaType } from '@ad/src/models/entities/ticketing';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface ConnectTicketingSystemFormProps {
  prefill?: ConnectTicketingSystemPrefillSchemaType;
}

export function ConnectTicketingSystemForm(props: ConnectTicketingSystemFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const connectTicketingSystem = trpc.connectTicketingSystem.useMutation();

  const searchParams = useSearchParams();
  const onboardingFlow = searchParams!.has('onboarding');

  const [showOtherIndication, setShowOtherIndication] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    control,
    watch,
  } = useForm<ConnectTicketingSystemSchemaType>({
    resolver: zodResolver(ConnectTicketingSystemSchema),
    defaultValues: {
      organizationId: props.prefill?.organizationId,
      ticketingSystemName: TicketingSystemNameSchema.Values.BILLETWEB,
      ...props.prefill,
    },
  });

  const onSubmit = useCallback(
    async (input: ConnectTicketingSystemSchemaType) => {
      if (showOtherIndication) {
        return;
      }

      const result = await connectTicketingSystem.mutateAsync(input);

      if (onboardingFlow) {
        router.push(linkRegistry.get('organization', { organizationId: props.prefill!.organizationId! }));
      } else {
        router.push(linkRegistry.get('ticketingSystemList', { organizationId: props.prefill!.organizationId! }));
      }

      push(['trackEvent', 'ticketing', 'connect', 'system', input.ticketingSystemName]);
    },
    [connectTicketingSystem, onboardingFlow, router, showOtherIndication, props.prefill]
  );

  const [showApiSecretKey, setShowApiSecretKey] = useState(false);
  const handleClickShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);
  const handleMouseDownShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);

  const [displayApiAccessKey, setDisplayApiAccessKey] = useState(true);

  const watchedTicketingSystemName = watch('ticketingSystemName');

  useEffect(() => {
    // Casting because otherwise it complexifies the whole form validation logic
    if ((watchedTicketingSystemName as any) === 'other') {
      setShowOtherIndication(true);

      return;
    }

    setShowOtherIndication(false);

    const required = ticketingSystemRequiresApiAccessKey[watchedTicketingSystemName];

    setDisplayApiAccessKey(required);

    // Reset the value if the field is not required so it's not passed when submitting (empty string will be converted to null)
    if (!required) {
      setValue('apiAccessKey', '');
    }
  }, [watchedTicketingSystemName, setValue]);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="créer une organisation">
      <Grid item xs={12}>
        <TextField
          select
          label="Système de billetterie"
          defaultValue={control._defaultValues.ticketingSystemName || ''}
          inputProps={register('ticketingSystemName')}
          error={!!errors.ticketingSystemName}
          helperText={errors.ticketingSystemName?.message}
          margin="dense"
          fullWidth
        >
          {Object.values(TicketingSystemNameSchema.Values).map((ticketingSystemName) => (
            <MenuItem key={ticketingSystemName} value={ticketingSystemName}>
              {t(`model.ticketingSystemName.enum.${ticketingSystemName}`)}
            </MenuItem>
          ))}
          <MenuItem value="other">Autre</MenuItem>
        </TextField>
      </Grid>
      {showOtherIndication ? (
        <Grid item xs={12}>
          <Alert severity="warning">
            Nous sommes désolés mais pour l&apos;instant nous ne supportons pas d&apos;autres sytèmes de billetterie. N&apos;hésitez pas à contacter
            notre support pour que nous planifions l&apos;implémentation du vôtre.
          </Alert>
        </Grid>
      ) : (
        <>
          {displayApiAccessKey && (
            <Grid item xs={12}>
              <TextField
                type="text"
                label="Identifiant utilisateur"
                {...register('apiAccessKey')}
                autoComplete="off"
                error={!!errors.apiAccessKey}
                helperText={errors?.apiAccessKey?.message}
                fullWidth
              />
            </Grid>
          )}
          <Grid item xs={12}>
            <TextField
              type="text"
              label="Clé d'accès"
              {...register('apiSecretKey')}
              autoComplete="off"
              error={!!errors.apiSecretKey}
              helperText={errors?.apiSecretKey?.message}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="changer la visibilité de la clé d'accès"
                      onClick={handleClickShowApiSecretKey}
                      onMouseDown={handleMouseDownShowApiSecretKey}
                    >
                      {showApiSecretKey ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& input': {
                  // When using `type="password"` Chrome was forcing autofilling password despite the `autocomplete="off"`, so using a text input with password style
                  // Note: this webkit property is broadly adopted so it's fine, and in case it's not, we are fine it's not like a standard password (should be longer than input display...)
                  '-webkit-text-security': showApiSecretKey ? 'none' : 'disc',
                },
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <Alert severity="info">
              Nous vous recommandons de suivre{' '}
              <Link
                component={NextLink}
                href={`https://atelier-numerique.notion.site/creer-une-cle-${watch('ticketingSystemName').toLowerCase()}`}
                target="_blank"
                onClick={() => {
                  push(['trackEvent', 'ticketing', 'openHowTo', 'system', getValues('ticketingSystemName')]);
                }}
                underline="none"
                sx={{
                  '&::after': {
                    display: 'none !important',
                  },
                }}
              >
                notre tutoriel pour bien configurer et récupérer les options de connexion
              </Link>{' '}
              à nous fournir.
            </Alert>
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" loading={connectTicketingSystem.isPending} size="large" variant="contained" fullWidth>
              Tester et connecter
            </Button>
          </Grid>
        </>
      )}
    </BaseForm>
  );
}
