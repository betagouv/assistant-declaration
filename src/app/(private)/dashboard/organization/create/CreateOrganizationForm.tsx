'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import SaveIcon from '@mui/icons-material/Save';
import Button from '@mui/lab/LoadingButton';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
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
    setValue,
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
        <TextField
          type="text"
          label="N° Siren"
          {...register('officialId')}
          error={!!errors.officialId}
          helperText={errors?.officialId?.message}
          fullWidth
        />
      </Grid>
      <Grid item xs={12}>
        <Button type="submit" loading={createOrganization.isLoading} size="large" variant="contained" startIcon={<SaveIcon />} fullWidth>
          Sauvegarder
        </Button>
      </Grid>
    </BaseForm>
  );
}
