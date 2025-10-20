'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { PasswordMutationInput } from '@ad/src/components/PasswordMutationInput';
import { ResetPasswordPrefillSchemaType, ResetPasswordSchema, ResetPasswordSchemaType } from '@ad/src/models/actions/auth';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export function ResetPasswordForm({ prefill }: { prefill?: ResetPasswordPrefillSchemaType }) {
  const resetPassword = trpc.resetPassword.useMutation();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      token: '',
      password: '',
      ...prefill,
    },
  });

  const onSubmit = async (input: ResetPasswordSchemaType) => {
    const result = await resetPassword.mutateAsync(input);

    router.push(linkRegistry.get('signIn', undefined));
  };

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="redéfinir son mot de passe">
      <div className={fr.cx('fr-col-12')}>
        <PasswordMutationInput
          label="Nouveau mot de passe"
          error={errors?.password?.message}
          nativeInputProps={{
            ...register('password'),
            autoComplete: 'new-password',
          }}
        />
      </div>
      <div className={fr.cx('fr-col-12')}>
        <ul className={fr.cx('fr-btns-group')}>
          <li>
            <Button type="submit" loading={resetPassword.isPending}>
              Mettre à jour
            </Button>
          </li>
        </ul>
      </div>
    </BaseForm>
  );
}
