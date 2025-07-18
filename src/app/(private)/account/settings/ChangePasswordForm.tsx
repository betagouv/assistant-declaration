'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Button, Grid, IconButton, InputAdornment, TextField } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { PasswordFieldHinter } from '@ad/src/components/PasswordFieldHinter';
import { ChangePasswordPrefillSchemaType, ChangePasswordSchema, ChangePasswordSchemaType } from '@ad/src/models/actions/auth';

export interface ChangePasswordFormProps {
  prefill?: ChangePasswordPrefillSchemaType;
  onSuccess?: () => void;
}

export function ChangePasswordForm(props: ChangePasswordFormProps) {
  const changePassword = trpc.changePassword.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    reset,
  } = useForm<ChangePasswordSchemaType>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: props.prefill,
  });

  const onSubmit = async (input: ChangePasswordSchemaType) => {
    await changePassword.mutateAsync(input);

    reset();

    if (props.onSuccess) {
      props.onSuccess();
    }
  };

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const handleClickShowCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword);
  const handleMouseDownShowCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const handleClickShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const handleMouseDownShowNewPassword = () => setShowNewPassword(!showNewPassword);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="changer son mot de passe">
      <Grid item xs={12}>
        <TextField
          type={showCurrentPassword ? 'text' : 'password'}
          label="Mot de passe actuel"
          {...register('currentPassword')}
          autoComplete="current-password"
          error={!!errors.currentPassword}
          helperText={errors?.currentPassword?.message}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="changer la visibilité du mot de passe"
                  onClick={handleClickShowCurrentPassword}
                  onMouseDown={handleMouseDownShowCurrentPassword}
                >
                  {showCurrentPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          type={showNewPassword ? 'text' : 'password'}
          label="Nouveau mot de passe"
          {...register('newPassword')}
          autoComplete="new-password"
          error={!!errors.newPassword}
          helperText={errors?.newPassword?.message}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="changer la visibilité du mot de passe"
                  onClick={handleClickShowNewPassword}
                  onMouseDown={handleMouseDownShowNewPassword}
                >
                  {showNewPassword ? <Visibility /> : <VisibilityOff />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        <PasswordFieldHinter password={watch('newPassword')} headline={`Le nouveau mot de passe doit contenir :`} />
      </Grid>
      <Grid item xs={12}>
        <Button type="submit" loading={changePassword.isPending} size="large" variant="contained" fullWidth>
          Changer
        </Button>
      </Grid>
    </BaseForm>
  );
}
