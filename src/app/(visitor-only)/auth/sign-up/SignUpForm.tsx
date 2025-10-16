'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { PasswordMutationInput } from '@ad/src/components/PasswordMutationInput';
import { SignUpPrefillSchemaType, SignUpSchema, SignUpSchemaType } from '@ad/src/models/actions/auth';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface SignUpFormProps {
  onSuccess: () => void;
}

export function SignUpForm({ prefill, onSuccess }: { prefill?: SignUpPrefillSchemaType } & SignUpFormProps) {
  const router = useRouter();

  const signUp = trpc.signUp.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<SignUpSchemaType>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: '',
      password: '',
      firstname: '',
      lastname: '',
      termsAccepted: true,
      ...prefill,
    },
  });

  const onSubmit = async (input: SignUpSchemaType) => {
    const result = await signUp.mutateAsync(input);

    onSuccess();
  };

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="s'inscrire">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
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
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Prénom"
              state={!!errors.firstname ? 'error' : undefined}
              stateRelatedMessage={errors?.firstname?.message}
              nativeInputProps={{
                ...register('firstname'),
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Nom"
              state={!!errors.lastname ? 'error' : undefined}
              stateRelatedMessage={errors?.lastname?.message}
              nativeInputProps={{
                ...register('lastname'),
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <PasswordMutationInput
              label="Mot de passe"
              error={errors?.password?.message}
              nativeInputProps={{
                ...register('password'),
                autoComplete: 'new-password',
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <Checkbox
              options={[
                {
                  label: (
                    <span>
                      J&apos;accepte les&nbsp;
                      <NextLink href={linkRegistry.get('termsOfUse', undefined)} className={fr.cx('fr-link')}>
                        modalités d&apos;utilisation
                      </NextLink>
                    </span>
                  ),
                  nativeInputProps: {
                    ...register('termsAccepted'),
                  },
                },
              ]}
              state={!!errors.termsAccepted ? 'error' : undefined}
              stateRelatedMessage={errors?.termsAccepted?.message}
              small
              className={fr.cx('fr-pb-2v')}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={signUp.isPending}>
                  S&apos;enregistrer
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
        <div>
          Vous possédez déjà un compte ?&nbsp;
          <NextLink href={linkRegistry.get('signIn', undefined)} className={fr.cx('fr-link')}>
            Se connecter
          </NextLink>
        </div>
      </div>
    </BaseForm>
  );
}
