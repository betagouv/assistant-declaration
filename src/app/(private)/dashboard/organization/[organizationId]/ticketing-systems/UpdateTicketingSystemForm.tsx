'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { LoadingButton as Button } from '@mui/lab';
import { Alert, Grid, IconButton, InputAdornment, Link, TextField } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import {
  UpdateTicketingSystemPrefillSchemaType,
  UpdateTicketingSystemSchema,
  UpdateTicketingSystemSchemaType,
} from '@ad/src/models/actions/ticketing';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';

export interface UpdateTicketingSystemFormProps {
  ticketingSystem: TicketingSystemSchemaType;
  prefill?: UpdateTicketingSystemPrefillSchemaType;
  onSuccess?: () => void;
}

export function UpdateTicketingSystemForm(props: UpdateTicketingSystemFormProps) {
  const updateTicketingSystem = trpc.updateTicketingSystem.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    control,
    watch,
  } = useForm<UpdateTicketingSystemSchemaType>({
    resolver: zodResolver(UpdateTicketingSystemSchema),
    defaultValues: {
      ...props.prefill,
      ticketingSystemId: props.ticketingSystem.id,
      ticketingSystemName: props.ticketingSystem.name,
    },
  });

  const onSubmit = async (input: UpdateTicketingSystemSchemaType) => {
    const result = await updateTicketingSystem.mutateAsync(input);

    props.onSuccess && props.onSuccess();

    push(['trackEvent', 'ticketing', 'update', 'system', input.ticketingSystemName]);
  };

  const [showApiSecretKey, setShowApiSecretKey] = useState(false);
  const handleClickShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);
  const handleMouseDownShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);

  const displayApiAccessKey = useMemo(() => ticketingSystemRequiresApiAccessKey[props.ticketingSystem.name], [props.ticketingSystem.name]);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="créer une organisation">
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
          Pour retrouver ou récréer vos identifiants, nous vous recommandons de suivre{' '}
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
            notre tutoriel
          </Link>
          .
        </Alert>
      </Grid>
      <Grid item xs={12}>
        <Button type="submit" loading={updateTicketingSystem.isLoading} size="large" variant="contained" fullWidth>
          Tester et enregistrer
        </Button>
      </Grid>
    </BaseForm>
  );
}
