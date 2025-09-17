'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { PasswordInput } from '@codegouvfr/react-dsfr/blocks/PasswordInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import {
  UpdateTicketingSystemPrefillSchemaType,
  UpdateTicketingSystemSchema,
  UpdateTicketingSystemSchemaType,
} from '@ad/src/models/actions/ticketing';
import { TicketingSystemSchemaType } from '@ad/src/models/entities/ticketing';

export interface UpdateTicketingSystemFormProps {
  ticketingSystem: TicketingSystemSchemaType;
  prefill?: UpdateTicketingSystemPrefillSchemaType;
  onSuccess?: () => void;
}

export function UpdateTicketingSystemForm(props: UpdateTicketingSystemFormProps) {
  const updateTicketingSystem = trpc.updateTicketingSystem.useMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    control,
    watch,
  } = useForm<UpdateTicketingSystemSchemaType>({
    resolver: zodResolver(UpdateTicketingSystemSchema),
    defaultValues: {
      ...props.prefill,
      ticketingSystemId: props.ticketingSystem.id,
      ticketingSystemName: props.ticketingSystem.name,
    },
  });

  const onSubmit = async (input: UpdateTicketingSystemSchemaType) => {
    const result = await updateTicketingSystem.mutateAsync(input);

    props.onSuccess && props.onSuccess();

    push(['trackEvent', 'ticketing', 'update', 'system', input.ticketingSystemName]);
  };

  const displayApiAccessKey = useMemo(() => ticketingSystemRequiresApiAccessKey[props.ticketingSystem.name], [props.ticketingSystem.name]);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="éditer un système de billetterie">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset', 'fr-mb-0')}>
          {displayApiAccessKey && (
            <div className={fr.cx('fr-fieldset__element')}>
              <Input
                label="Identifiant utilisateur"
                state={!!errors.apiAccessKey ? 'error' : undefined}
                stateRelatedMessage={errors?.apiAccessKey?.message}
                nativeInputProps={{
                  ...register('apiAccessKey'),
                  autoComplete: 'off',
                }}
              />
            </div>
          )}
          <div className={fr.cx('fr-fieldset__element')}>
            <PasswordInput
              label="Clé d'accès"
              messages={errors?.apiSecretKey ? [{ severity: 'error', message: errors?.apiSecretKey?.message }] : []}
              nativeInputProps={{
                ...register('apiSecretKey'),
                autoComplete: 'off',
              }}
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <Alert
              severity="info"
              small={false}
              title="Tutoriel de branchement"
              description={
                <>
                  Pour retrouver ou récréer vos identifiants, nous vous recommandons de suivre{' '}
                  <NextLink
                    href={`https://atelier-numerique.notion.site/creer-une-cle-${watch('ticketingSystemName').toLowerCase()}`}
                    target="_blank"
                    onClick={() => {
                      push(['trackEvent', 'ticketing', 'openHowTo', 'system', getValues('ticketingSystemName')]);
                    }}
                    className={fr.cx('fr-link')}
                  >
                    notre tutoriel
                  </NextLink>
                  .
                </>
              }
            />
          </div>
          <div className={fr.cx('fr-fieldset__element')}>
            <ul className={fr.cx('fr-btns-group')}>
              <li>
                <Button type="submit" loading={updateTicketingSystem.isPending}>
                  Tester et enregistrer
                </Button>
              </li>
            </ul>
          </div>
        </fieldset>
      </div>
    </BaseForm>
  );
}
