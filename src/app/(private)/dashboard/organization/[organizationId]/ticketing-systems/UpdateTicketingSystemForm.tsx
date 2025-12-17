'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { zodResolver } from '@hookform/resolvers/zod';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
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
    // Generic type needed due to `z.preprocess` breaking inference
    resolver: zodResolver(UpdateTicketingSystemSchema),
    defaultValues: {
      ticketingSystemId: props.ticketingSystem.id,
      ticketingSystemName: props.ticketingSystem.name,
      apiAccessKey: '',
      apiSecretKey: '',
      ...props.prefill,
    },
  });

  const onSubmit = async (input: UpdateTicketingSystemSchemaType) => {
    const result = await updateTicketingSystem.mutateAsync(input);

    props.onSuccess && props.onSuccess();

    push(['trackEvent', 'ticketing', 'update', 'system', input.ticketingSystemName]);
  };

  const [showApiSecretKey, setShowApiSecretKey] = useState(false);
  const handleApiSecretKeyDisplayToggle = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const checked = event.target.checked;

      setShowApiSecretKey(checked);
    },
    [setShowApiSecretKey]
  );

  const displayApiAccessKey = useMemo(() => ticketingSystemRequiresApiAccessKey[props.ticketingSystem.name], [props.ticketingSystem.name]);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="éditer un système de billetterie">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset', 'fr-mb-0')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Alert
              as="h2"
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
          {displayApiAccessKey && (
            <div className={fr.cx('fr-fieldset__element')}>
              <Input
                label="Identifiant de la clé d'accès"
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
            <Input
              label={
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div>Clé d&apos;accès</div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox
                      options={[
                        {
                          label: 'Afficher',
                          nativeInputProps: {
                            checked: showApiSecretKey,
                            onChange: handleApiSecretKeyDisplayToggle,
                          },
                        },
                      ]}
                      small
                    />
                  </div>
                </div>
              }
              state={!!errors.apiSecretKey ? 'error' : undefined}
              stateRelatedMessage={errors?.apiSecretKey?.message}
              nativeInputProps={{
                ...register('apiSecretKey'),
                autoComplete: 'off',
                style: {
                  // When using `type="password"` Chrome was forcing autofilling password despite the `autocomplete="off"`, so using a text input with password style
                  // Note: this webkit property is broadly adopted so it's fine, and in case it's not, we are fine it's not like a standard password (should be longer than input display...)
                  ...({
                    WebkitTextSecurity: showApiSecretKey ? 'none' : 'disc',
                  } as React.CSSProperties), // Have to cast since `WebkitTextSecurity` not recognized
                },
              }}
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
