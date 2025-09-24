'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { PasswordInput } from '@codegouvfr/react-dsfr/blocks/PasswordInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { PasswordMutationInput } from '@ad/src/components/PasswordMutationInput';
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

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="changer son mot de passe">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <PasswordInput
              label="Mot de passe actuel"
              messages={errors?.currentPassword ? [{ severity: 'error', message: errors?.currentPassword?.message }] : []}
              nativeInputProps={{
                ...register('currentPassword'),
                autoComplete: 'current-password',
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <PasswordMutationInput
              label="Nouveau mot de passe"
              error={errors?.newPassword?.message}
              nativeInputProps={{
                ...register('newPassword'),
                autoComplete: 'new-password',
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={changePassword.isPending}>
                  Changer
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
