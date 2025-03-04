'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import Button from '@mui/lab/LoadingButton';
import { Alert, IconButton, InputAdornment, Link, MenuItem } from '@mui/material';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  const {
    register,
    handleSubmit,
    formState: { errors },
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

  const onSubmit = async (input: ConnectTicketingSystemSchemaType) => {
    const result = await connectTicketingSystem.mutateAsync(input);

    router.push(linkRegistry.get('organization', { organizationId: result.organization.id }));
  };

  const [showApiSecretKey, setShowApiSecretKey] = useState(false);
  const handleClickShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);
  const handleMouseDownShowApiSecretKey = () => setShowApiSecretKey(!showApiSecretKey);

  const [displayApiAccessKey, setDisplayApiAccessKey] = useState(true);

  useEffect(() => {
    const required = ticketingSystemRequiresApiAccessKey[control._formValues.ticketingSystemName as TicketingSystemNameSchemaType];

    setDisplayApiAccessKey(required);

    // Reset the value if the field is not required so it's not passed when submitting (empty string will be converted to null)
    if (!required) {
      setValue('apiAccessKey', '');
    }
  }, [watch('ticketingSystemName')]);

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
        </TextField>
      </Grid>
      {displayApiAccessKey && (
        <Grid item xs={12}>
          <TextField
            type="text"
            label="Identifiant utilisateur"
            {...register('apiAccessKey')}
            error={!!errors.apiAccessKey}
            helperText={errors?.apiAccessKey?.message}
            fullWidth
          />
        </Grid>
      )}
      <Grid item xs={12}>
        <TextField
          type={showApiSecretKey ? 'text' : 'password'}
          label="Clé d'accès"
          {...register('apiSecretKey')}
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
        />
      </Grid>
      <Grid item xs={12}>
        <Alert severity="info">
          Nous vous recommandons de suivre{' '}
          <Link
            component={NextLink}
            href={`https://atelier-numerique.notion.site/creer-une-cle-${watch('ticketingSystemName').toLowerCase()}`}
            target="_blank"
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
        <Button type="submit" loading={connectTicketingSystem.isLoading} size="large" variant="contained" fullWidth>
          Tester et connecter
        </Button>
      </Grid>
    </BaseForm>
  );
}
