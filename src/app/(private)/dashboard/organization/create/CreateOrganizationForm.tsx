'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { CompanyHeadquartersField } from '@ad/src/components/CompanyHeadquartersField';
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
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Controller
              control={control}
              name="officialHeadquartersId"
              render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                return (
                  <CompanyHeadquartersField
                    value={value ? { officialHeadquartersId: value } : null}
                    defaultSuggestions={[]}
                    inputProps={{
                      label: 'N° Siret',
                      nativeInputProps: {
                        placeholder: "Recherche par identifiant ou nom de l'entreprise",
                      },
                    }}
                    onChange={(newValue) => {
                      if (newValue) {
                        onChange(newValue.officialHeadquartersId);

                        // Fill in the name input, the user will still be able to adjust it
                        setValue('name', newValue.name, { shouldDirty: true });
                      } else {
                        onChange(null); // Do not override the name in this case
                      }
                    }}
                    onBlur={onBlur}
                    errorMessage={error?.message}
                  />
                );
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <Input
              label="Nom"
              state={!!errors.name ? 'error' : undefined}
              stateRelatedMessage={errors?.name?.message}
              nativeInputProps={{
                ...register('name'),
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={createOrganization.isPending}>
                  <span className={fr.cx('fr-icon-save-3-fill')} style={{ marginRight: 5 }} aria-hidden="true"></span>
                  Sauvegarder
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
