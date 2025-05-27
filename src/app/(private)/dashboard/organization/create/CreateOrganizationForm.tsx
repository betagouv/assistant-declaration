'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from '@mui/icons-material';
import { LoadingButton as Button } from '@mui/lab';
import { Grid, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { createOfficialIdMaskInput } from '@ad/src/components/OfficialIdField';
import { CreateOrganizationPrefillSchemaType, CreateOrganizationSchema, CreateOrganizationSchemaType } from '@ad/src/models/actions/organization';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface CreateOrganizationFormProps {
  prefill?: CreateOrganizationPrefillSchemaType;
}

export function CreateOrganizationForm(props: CreateOrganizationFormProps) {
  const router = useRouter();

  const createOrganization = trpc.createOrganization.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<CreateOrganizationSchemaType>({
    resolver: zodResolver(CreateOrganizationSchema),
    defaultValues: {
      ...props.prefill,
    },
  });

  const onSubmit = async (input: CreateOrganizationSchemaType) => {
    const result = await createOrganization.mutateAsync(input);

    router.push(linkRegistry.get('organization', { organizationId: result.organization.id }));
  };

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="créer une organisation">
      <Grid item xs={12}>
        <TextField type="text" label="Nom" {...register('name')} error={!!errors.name} helperText={errors?.name?.message} fullWidth />
      </Grid>
      <Grid item xs={12}>
        <Controller
          control={control}
          name="officialId"
          defaultValue={control._defaultValues.officialId || ''}
          render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
            // Needed to listen for unmasked value
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const component = useMemo(
              () =>
                createOfficialIdMaskInput({
                  onAccept: (unmaskedValue) => {
                    onChange(unmaskedValue);
                  },
                }),
              [onChange]
            );

            return (
              <TextField
                type="text"
                label="N° Siren"
                value={value}
                onBlur={onBlur}
                error={!!error}
                helperText={error?.message}
                fullWidth
                InputProps={{
                  inputComponent: component,
                }}
              />
            );
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <Button type="submit" loading={createOrganization.isLoading} size="large" variant="contained" startIcon={<Save />} fullWidth>
          Sauvegarder
        </Button>
      </Grid>
    </BaseForm>
  );
}
