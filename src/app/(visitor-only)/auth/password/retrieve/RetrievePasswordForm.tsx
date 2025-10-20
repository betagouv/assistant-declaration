'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from 'next/link';
import React from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { RequestNewPasswordPrefillSchemaType, RequestNewPasswordSchema, RequestNewPasswordSchemaType } from '@ad/src/models/actions/auth';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface RetrievePasswordFormProps {
  prefill?: RequestNewPasswordPrefillSchemaType;
  onSuccess?: () => Promise<void>;
}

export function RetrievePasswordForm(props: RetrievePasswordFormProps) {
  const requestNewPassword = trpc.requestNewPassword.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({
    resolver: zodResolver(RequestNewPasswordSchema),
    defaultValues: {
      email: '',
      ...props.prefill,
    },
  });

  const onSubmit = async (input: RequestNewPasswordSchemaType) => {
    const result = await requestNewPassword.mutateAsync(input);

    if (props.onSuccess) {
      await props.onSuccess();
    }
  };

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="demander à réinitialiser son mot de passe">
      <div className={fr.cx('fr-col-12')}>
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
      <div className={fr.cx('fr-col-12')}>
        <ul className={fr.cx('fr-btns-group')}>
          <li>
            <Button type="submit" loading={requestNewPassword.isPending}>
              Valider
            </Button>
          </li>
        </ul>
      </div>
      <div className={fr.cx('fr-col-12')}>
        <NextLink href={linkRegistry.get('signIn', undefined)} className={fr.cx('fr-link')}>
          Retourner à la page de connexion
        </NextLink>
      </div>
    </BaseForm>
  );
}
