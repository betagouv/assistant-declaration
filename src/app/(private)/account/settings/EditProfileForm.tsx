'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { UpdateProfilePrefillSchemaType, UpdateProfileSchema, UpdateProfileSchemaType } from '@ad/src/models/actions/user';

export interface EditProfileFormProps {
  email: string;
  prefill?: UpdateProfilePrefillSchemaType;
  onSuccess?: () => void;
}

export function EditProfileForm(props: EditProfileFormProps) {
  const updateProfile = trpc.updateProfile.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UpdateProfileSchemaType>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      ...props.prefill,
    },
  });

  const onSubmit = async (input: UpdateProfileSchemaType) => {
    await updateProfile.mutateAsync(input);

    if (props.onSuccess) {
      props.onSuccess();
    }
  };

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="éditer son profil">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Email"
              disabled
              nativeInputProps={{
                type: 'email',
                value: props.email,
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
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={updateProfile.isPending}>
                  Mettre à jour
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
