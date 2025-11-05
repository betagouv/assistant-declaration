'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Alert } from '@codegouvfr/react-dsfr/Alert';
import Checkbox from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import { zodResolver } from '@hookform/resolvers/zod';
import { push } from '@socialgouv/matomo-next';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChangeEventHandler, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { ticketingSystemRequiresApiAccessKey } from '@ad/src/core/ticketing/common';
import {
  ConnectTicketingSystemPrefillSchemaType,
  ConnectTicketingSystemSchema,
  ConnectTicketingSystemSchemaType,
} from '@ad/src/models/actions/ticketing';
import { TicketingSystemNameSchema } from '@ad/src/models/entities/ticketing';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface ConnectTicketingSystemFormProps {
  prefill?: ConnectTicketingSystemPrefillSchemaType;
}

export function ConnectTicketingSystemForm(props: ConnectTicketingSystemFormProps) {
  const { t } = useTranslation('common');
  const router = useRouter();

  const connectTicketingSystem = trpc.connectTicketingSystem.useMutation();

  const searchParams = useSearchParams();
  const onboardingFlow = searchParams!.has('onboarding');

  const [showOtherIndication, setShowOtherIndication] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    control,
    watch,
  } = useForm<ConnectTicketingSystemSchemaType>({
    // Generic type needed due to `z.preprocess` breaking inference
    resolver: zodResolver(ConnectTicketingSystemSchema),
    defaultValues: {
      organizationId: '',
      ticketingSystemName: TicketingSystemNameSchema.enum.BILLETWEB,
      apiAccessKey: '',
      apiSecretKey: '',
      ...props.prefill,
    },
  });

  const onSubmit = useCallback(
    async (input: ConnectTicketingSystemSchemaType) => {
      if (showOtherIndication) {
        return;
      }

      const result = await connectTicketingSystem.mutateAsync(input);

      if (onboardingFlow) {
        router.push(linkRegistry.get('organization', { organizationId: props.prefill!.organizationId! }));
      } else {
        router.push(linkRegistry.get('ticketingSystemList', { organizationId: props.prefill!.organizationId! }));
      }

      push(['trackEvent', 'ticketing', 'connect', 'system', input.ticketingSystemName]);
    },
    [connectTicketingSystem, onboardingFlow, router, showOtherIndication, props.prefill]
  );

  const [showApiSecretKey, setShowApiSecretKey] = useState(false);
  const handleApiSecretKeyDisplayToggle = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (event) => {
      const checked = event.target.checked;

      setShowApiSecretKey(checked);
    },
    [setShowApiSecretKey]
  );

  const [displayApiAccessKey, setDisplayApiAccessKey] = useState(true);

  const watchedTicketingSystemName = watch('ticketingSystemName');

  useEffect(() => {
    // Casting because otherwise it complexifies the whole form validation logic
    if ((watchedTicketingSystemName as any) === 'other') {
      setShowOtherIndication(true);

      return;
    }

    setShowOtherIndication(false);

    const required = ticketingSystemRequiresApiAccessKey[watchedTicketingSystemName];

    setDisplayApiAccessKey(required);

    // Reset the value if the field is not required so it's not passed when submitting (empty string will be converted to null)
    if (!required) {
      setValue('apiAccessKey', '', { shouldDirty: true });
    }
  }, [watchedTicketingSystemName, setValue]);

  return (
    <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="connecter un système de billetterie">
      <div className={fr.cx('fr-col-12')}>
        <fieldset className={fr.cx('fr-fieldset')}>
          <div className={fr.cx('fr-fieldset__element')}>
            <Select
              label="Système de billetterie"
              state={!!errors.ticketingSystemName ? 'error' : undefined}
              stateRelatedMessage={errors?.ticketingSystemName?.message}
              nativeSelectProps={{
                ...register('ticketingSystemName'),
              }}
              options={[
                ...TicketingSystemNameSchema.options.map((ticketingSystemName) => {
                  return {
                    label: t(`model.ticketingSystemName.enum.${ticketingSystemName}`),
                    value: ticketingSystemName,
                  };
                }),
                {
                  label: 'Autre',
                  value: 'other',
                },
              ]}
            />
          </div>
          {showOtherIndication ? (
            <div className={fr.cx('fr-fieldset__element')}>
              <Alert
                severity="warning"
                small={true}
                description="Nous sommes désolés mais pour l'instant nous ne supportons pas d'autres sytèmes de billetterie. N'hésitez pas à contacter notre support pour que nous planifions l'implémentation du vôtre."
              />
            </div>
          ) : (
            <>
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
                <Alert
                  as="h2"
                  severity="info"
                  small={false}
                  title="Tutoriel de branchement"
                  description={
                    <>
                      Nous vous recommandons de suivre{' '}
                      <NextLink
                        href={`https://atelier-numerique.notion.site/creer-une-cle-${watch('ticketingSystemName').toLowerCase()}`}
                        target="_blank"
                        onClick={() => {
                          push(['trackEvent', 'ticketing', 'openHowTo', 'system', getValues('ticketingSystemName')]);
                        }}
                        className={fr.cx('fr-link')}
                      >
                        notre tutoriel pour bien configurer et récupérer les options de connexion
                      </NextLink>{' '}
                      à nous fournir.
                    </>
                  }
                />
              </div>
              <div className={fr.cx('fr-fieldset__element')}>
                <ul className={fr.cx('fr-btns-group')}>
                  <li>
                    <Button type="submit" loading={connectTicketingSystem.isPending}>
                      Tester et connecter
                    </Button>
                  </li>
                </ul>
              </div>
            </>
          )}
        </fieldset>
      </div>
    </BaseForm>
  );
}
