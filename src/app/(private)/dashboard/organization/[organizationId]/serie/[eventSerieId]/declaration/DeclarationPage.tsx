'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import addressFormatter from '@fragaria/address-formatter';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertProps, Autocomplete, Snackbar } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import debounce from 'lodash.debounce';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { usePrevious } from 'react-use';

import { DeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPageContext';
import { trpc } from '@ad/src/client/trpcClient';
import { AddressField } from '@ad/src/components/AddressField';
import { AmountInput } from '@ad/src/components/AmountInput';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { CompanyField } from '@ad/src/components/CompanyField';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventsFieldsets } from '@ad/src/components/EventsFieldsets';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { officialHeadquartersIdMask } from '@ad/src/components/OfficialHeadquartersIdField';
import { SacdIdInput } from '@ad/src/components/SacdIdField';
import { SacemIdInput } from '@ad/src/components/SacemIdField';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { currentTaxRates } from '@ad/src/core/declaration';
import { getEventsKeyFigures } from '@ad/src/core/declaration/format';
import { FillDeclarationSchema, FillDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { AddressInputSchemaType } from '@ad/src/models/entities/address';
import { DeclarationTypeSchema, DeclarationTypeSchemaType } from '@ad/src/models/entities/common';
import { AudienceSchema, PerformanceTypeSchema } from '@ad/src/models/entities/event';
import { formatMaskedValue } from '@ad/src/utils/imask';
import { AggregatedQueries } from '@ad/src/utils/trpc';

export interface DeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function DeclarationPage({ params: { organizationId, eventSerieId } }: DeclarationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualDeclarationHeader } = useContext(DeclarationPageContext);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const fillDeclaration = trpc.fillDeclaration.useMutation();
  const transmitDeclaration = trpc.transmitDeclaration.useMutation();

  const getDeclaration = trpc.getDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getDeclaration);

  const [formInitialized, setFormInitialized] = useState<boolean>(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
    control,
    watch,
    trigger,
    reset,
  } = useForm<FillDeclarationSchemaType>({
    resolver: zodResolver(FillDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
      eventSerie: {
        expectedDeclarationTypes: [],
      },
      events: [], // To avoid being "undefined"
    }, // The rest will be set with data fetched
  });

  // Due to the UI having tabs to switch between different declarations, we make sure the user is aware of loosing modifications
  useConfirmationIfUnsavedChange(isDirty);

  const onSubmit = useCallback(
    async (input: FillDeclarationSchemaType) => {
      const result = await fillDeclaration.mutateAsync(input);

      // Reset the form state so fields considered as "dirty" are no longer
      const tmpAddress = result.declaration.eventSerie.place?.address ?? null;
      let addressInput: AddressInputSchemaType | null = null;

      if (tmpAddress) {
        const { id, ...liteAddress } = tmpAddress;
        addressInput = liteAddress;
      }

      reset({
        eventSerieId: eventSerieId,
        organization: {
          sacemId: result.declaration.organization.sacemId,
          sacdId: result.declaration.organization.sacdId,
        },
        eventSerie: {
          producer:
            result.declaration.eventSerie.producerOfficialId && result.declaration.eventSerie.producerName
              ? {
                  officialId: result.declaration.eventSerie.producerOfficialId,
                  name: result.declaration.eventSerie.producerName,
                }
              : null,
          performanceType: result.declaration.eventSerie.performanceType,
          expectedDeclarationTypes: result.declaration.eventSerie.expectedDeclarationTypes,
          place: {
            name: result.declaration.eventSerie.place?.name ?? null,
            address: addressInput,
          },
          placeCapacity: result.declaration.eventSerie.placeCapacity,
          audience: result.declaration.eventSerie.audience,
          ticketingRevenueTaxRate: result.declaration.eventSerie.ticketingRevenueTaxRate,
          expensesExcludingTaxes: result.declaration.eventSerie.expensesExcludingTaxes,
          introductionFeesExpensesExcludingTaxes: result.declaration.eventSerie.introductionFeesExpensesExcludingTaxes,
          circusSpecificExpensesExcludingTaxes: result.declaration.eventSerie.circusSpecificExpensesExcludingTaxes,
        },
        events: result.declaration.events.map((event) => {
          const tmpEventAddress = event.placeOverride?.address ?? result.declaration.eventSerie.place?.address ?? null;
          let eventAddressInput: AddressInputSchemaType | null = null;

          if (tmpEventAddress) {
            const { id, ...liteEventAddress } = tmpEventAddress;
            eventAddressInput = liteEventAddress;
          }

          return {
            id: event.id,
            startAt: event.startAt,
            endAt: event.endAt,
            ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
            ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
            consumptionsRevenueIncludingTaxes: event.consumptionsRevenueIncludingTaxes,
            consumptionsRevenueExcludingTaxes: event.consumptionsRevenueExcludingTaxes,
            consumptionsRevenueTaxRate: event.consumptionsRevenueTaxRate,
            cateringRevenueIncludingTaxes: event.cateringRevenueIncludingTaxes,
            cateringRevenueExcludingTaxes: event.cateringRevenueExcludingTaxes,
            cateringRevenueTaxRate: event.cateringRevenueTaxRate,
            programSalesRevenueIncludingTaxes: event.programSalesRevenueIncludingTaxes,
            programSalesRevenueExcludingTaxes: event.programSalesRevenueExcludingTaxes,
            programSalesRevenueTaxRate: event.programSalesRevenueTaxRate,
            otherRevenueIncludingTaxes: event.otherRevenueIncludingTaxes,
            otherRevenueExcludingTaxes: event.otherRevenueExcludingTaxes,
            otherRevenueTaxRate: event.otherRevenueTaxRate,
            freeTickets: event.freeTickets,
            paidTickets: event.paidTickets,
            placeOverride: {
              name: event.placeOverride?.name ?? result.declaration.eventSerie.place?.name ?? null,
              address: eventAddressInput,
            },
            placeCapacityOverride: event.placeCapacityOverride ?? result.declaration.eventSerie.placeCapacity,
            audienceOverride: event.audienceOverride ?? result.declaration.eventSerie.audience,
            ticketingRevenueTaxRateOverride: event.ticketingRevenueTaxRateOverride ?? result.declaration.eventSerie.ticketingRevenueTaxRate,
          };
        }),
      });

      push(['trackEvent', 'declaration', 'fill']);
    },
    [fillDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (getDeclaration.data) {
      if (!formInitialized) {
        setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

        const tmpAddress = getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.address ?? null;
        let addressInput: AddressInputSchemaType | null = null;

        if (tmpAddress) {
          const { id, ...liteAddress } = tmpAddress;
          addressInput = liteAddress;
        }

        // Update the form with fetched data
        reset({
          eventSerieId: eventSerieId,
          organization: {
            sacemId: getDeclaration.data.declarationWrapper.declaration.organization.sacemId,
            sacdId: getDeclaration.data.declarationWrapper.declaration.organization.sacdId,
          },
          eventSerie: {
            producer:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.producerOfficialId &&
              getDeclaration.data.declarationWrapper.declaration.eventSerie.producerName
                ? {
                    officialId: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerOfficialId,
                    name: getDeclaration.data.declarationWrapper.declaration.eventSerie.producerName,
                  }
                : null,
            performanceType: getDeclaration.data.declarationWrapper.declaration.eventSerie.performanceType,
            expectedDeclarationTypes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expectedDeclarationTypes,
            place: {
              name: getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.name ?? null,
              address: addressInput,
            },
            placeCapacity: getDeclaration.data.declarationWrapper.declaration.eventSerie.placeCapacity,
            audience: getDeclaration.data.declarationWrapper.declaration.eventSerie.audience,
            ticketingRevenueTaxRate: getDeclaration.data.declarationWrapper.declaration.eventSerie.ticketingRevenueTaxRate,
            expensesExcludingTaxes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expensesExcludingTaxes,
            introductionFeesExpensesExcludingTaxes:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.introductionFeesExpensesExcludingTaxes,
            circusSpecificExpensesExcludingTaxes: getDeclaration.data.declarationWrapper.declaration.eventSerie.circusSpecificExpensesExcludingTaxes,
          },
          events: getDeclaration.data.declarationWrapper.declaration.events.map((event) => {
            const tmpEventAddress =
              event.placeOverride?.address ?? getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.address ?? null;
            let eventAddressInput: AddressInputSchemaType | null = null;

            if (tmpEventAddress) {
              const { id, ...liteEventAddress } = tmpEventAddress;
              eventAddressInput = liteEventAddress;
            }

            return {
              id: event.id,
              startAt: event.startAt,
              endAt: event.endAt,
              ticketingRevenueIncludingTaxes: event.ticketingRevenueIncludingTaxes,
              ticketingRevenueExcludingTaxes: event.ticketingRevenueExcludingTaxes,
              consumptionsRevenueIncludingTaxes: event.consumptionsRevenueIncludingTaxes,
              consumptionsRevenueExcludingTaxes: event.consumptionsRevenueExcludingTaxes,
              consumptionsRevenueTaxRate: event.consumptionsRevenueTaxRate,
              cateringRevenueIncludingTaxes: event.cateringRevenueIncludingTaxes,
              cateringRevenueExcludingTaxes: event.cateringRevenueExcludingTaxes,
              cateringRevenueTaxRate: event.cateringRevenueTaxRate,
              programSalesRevenueIncludingTaxes: event.programSalesRevenueIncludingTaxes,
              programSalesRevenueExcludingTaxes: event.programSalesRevenueExcludingTaxes,
              programSalesRevenueTaxRate: event.programSalesRevenueTaxRate,
              otherRevenueIncludingTaxes: event.otherRevenueIncludingTaxes,
              otherRevenueExcludingTaxes: event.otherRevenueExcludingTaxes,
              otherRevenueTaxRate: event.otherRevenueTaxRate,
              freeTickets: event.freeTickets,
              paidTickets: event.paidTickets,
              placeOverride: {
                name: event.placeOverride?.name ?? getDeclaration.data.declarationWrapper.declaration.eventSerie.place?.name ?? null,
                address: eventAddressInput,
              },
              placeCapacityOverride: event.placeCapacityOverride ?? getDeclaration.data.declarationWrapper.declaration.eventSerie.placeCapacity,
              audienceOverride: event.audienceOverride ?? getDeclaration.data.declarationWrapper.declaration.eventSerie.audience,
              ticketingRevenueTaxRateOverride:
                event.ticketingRevenueTaxRateOverride ?? getDeclaration.data.declarationWrapper.declaration.eventSerie.ticketingRevenueTaxRate,
            };
          }),
        });
      }
    }
  }, [getDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

  const { computedStartAt, computedEndAt, eventsKeyFigures } = useMemo(() => {
    // TODO: this should be based on form data, not the one from the API (since it needs to use local state)
    if (getDeclaration.data && getDeclaration.data.declarationWrapper.declaration.events.length > 0) {
      const ascendingEvents = getDeclaration.data.declarationWrapper.declaration.events.sort((a, b) => +a.startAt - +b.startAt);

      return {
        computedStartAt: ascendingEvents[0].startAt,
        computedEndAt: ascendingEvents[ascendingEvents.length - 1].endAt ?? ascendingEvents[ascendingEvents.length - 1].startAt,
        eventsKeyFigures: getEventsKeyFigures(getDeclaration.data.declarationWrapper.declaration.events),
      };
    } else {
      return {
        computedStartAt: new Date(0),
        computedEndAt: new Date(0),
        eventsKeyFigures: getEventsKeyFigures([]),
      };
    }
  }, [getDeclaration.data]);

  const [snackbarAlert, setSnackbarAlert] = useState<React.JSX.Element | null>(null);
  const handleCloseSnackbar = useCallback(() => setSnackbarAlert(null), [setSnackbarAlert]);

  const displayDefaultImpactMessage = useCallback(
    async (modifiedEvents: number, totalEvents: number) => {
      let severity: AlertProps['severity'];
      let message: string;

      if (modifiedEvents === totalEvents) {
        severity = 'success';
        message = `La valeur a été appliquée sur toutes les représentations`;
      } else if (modifiedEvents > 0) {
        severity = 'warning';
        message = `La valeur a été appliquée sur ${modifiedEvents} des ${totalEvents} représentations`;
      } else {
        severity = 'error';
        message = `La valeur n'a été appliquée sur aucune représentation, il est probable que chacune ait déjà une valeur spécifique`;
      }

      setSnackbarAlert(
        <Alert severity={severity} onClose={handleCloseSnackbar}>
          {message}
        </Alert>
      );
    },
    [setSnackbarAlert, handleCloseSnackbar]
  );

  const debouncedDisplayDefaultImpactMessage = useMemo(() => debounce(displayDefaultImpactMessage, 1500), []);
  useEffect(() => {
    return () => {
      debouncedDisplayDefaultImpactMessage.cancel();
    };
  }, [debouncedDisplayDefaultImpactMessage]);

  // Modifying a default property should impact events that had the same value as before modification
  const currentPlaceName = watch('eventSerie.place.name');
  const previousPlaceName = usePrevious(currentPlaceName);
  useEffect(() => {
    if (previousPlaceName !== undefined && currentPlaceName !== previousPlaceName) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.placeOverride.name === null || event.placeOverride.name === previousPlaceName) {
          setValue(`events.${eventIndex}.placeOverride.name`, currentPlaceName, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      debouncedDisplayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousPlaceName, currentPlaceName, getValues, setValue, debouncedDisplayDefaultImpactMessage]);

  const currentPlaceAddress = watch('eventSerie.place.address');
  const previousPlaceAddress = usePrevious(currentPlaceAddress);
  useEffect(() => {
    if (previousPlaceAddress !== undefined && JSON.stringify(currentPlaceAddress) !== JSON.stringify(previousPlaceAddress)) {
      const events = getValues('events');
      const previousPlaceAddressStringToCompare = JSON.stringify(previousPlaceAddress);
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.placeOverride.address === null || JSON.stringify(event.placeOverride.address) === previousPlaceAddressStringToCompare) {
          setValue(`events.${eventIndex}.placeOverride.address`, currentPlaceAddress, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      displayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousPlaceAddress, currentPlaceAddress, getValues, setValue, displayDefaultImpactMessage]);

  const currentPlaceCapacity = watch('eventSerie.placeCapacity');
  const previousPlaceCapacity = usePrevious(currentPlaceCapacity);
  useEffect(() => {
    if (previousPlaceCapacity !== undefined && currentPlaceCapacity !== previousPlaceCapacity) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.placeCapacityOverride === null || event.placeCapacityOverride === previousPlaceCapacity) {
          setValue(`events.${eventIndex}.placeCapacityOverride`, currentPlaceCapacity, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      displayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousPlaceCapacity, currentPlaceCapacity, getValues, setValue, displayDefaultImpactMessage]);

  const currentAudience = watch('eventSerie.audience');
  const previousAudience = usePrevious(currentAudience);
  useEffect(() => {
    if (previousAudience !== undefined && currentAudience !== previousAudience) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.audienceOverride === null || event.audienceOverride === previousAudience) {
          setValue(`events.${eventIndex}.audienceOverride`, currentAudience, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      displayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousAudience, currentAudience, getValues, setValue, displayDefaultImpactMessage]);

  const currentTicketingRevenueTaxRate = watch('eventSerie.ticketingRevenueTaxRate');
  const previousTicketingRevenueTaxRate = usePrevious(currentTicketingRevenueTaxRate);
  useEffect(() => {
    if (previousTicketingRevenueTaxRate !== undefined && currentTicketingRevenueTaxRate !== previousTicketingRevenueTaxRate) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.ticketingRevenueTaxRateOverride === null || event.ticketingRevenueTaxRateOverride === previousTicketingRevenueTaxRate) {
          setValue(`events.${eventIndex}.ticketingRevenueTaxRateOverride`, currentTicketingRevenueTaxRate, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      displayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousTicketingRevenueTaxRate, currentTicketingRevenueTaxRate, getValues, setValue, displayDefaultImpactMessage]);

  if (aggregatedQueries.isPending) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <div className={fr.cx('fr-container', 'fr-py-12v')}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
          <div className={fr.cx('fr-col-md-8', 'fr-col-lg-6')}>
            <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
          </div>
        </div>
      </div>
    );
  }

  console.log(1111111);

  const declarationWrapper = getDeclaration.data!.declarationWrapper;
  const declaration = declarationWrapper.declaration;

  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')} style={{ height: '100%' }}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')} style={{ height: '100%' }}>
        {declaration.events.length > 0 ? (
          <>
            <div className={fr.cx('fr-col-12')}>
              <div className={fr.cx('fr-col-12')}>
                <BaseForm handleSubmit={handleSubmit} onSubmit={onSubmit} control={control} ariaLabel="connecter un système de billetterie">
                  <div className={fr.cx('fr-col-12')}>
                    <fieldset className={fr.cx('fr-fieldset')}>
                      <p>TODO: set in modal</p>
                      <Controller
                        control={control}
                        name="eventSerie.expectedDeclarationTypes"
                        render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                          return (
                            <Checkbox
                              legend="Choisir le ou les organismes auxquels déclarer ce spectacle :"
                              state={!!error ? 'error' : undefined}
                              stateRelatedMessage={error?.message}
                              options={DeclarationTypeSchema.options.map((declarationType) => {
                                return {
                                  label: t(`model.declarationType.enum.${declarationType}`),
                                  nativeInputProps: {
                                    name: `checkbox-${declarationType}`,
                                    value: declarationType,
                                    defaultChecked: value.includes(declarationType),
                                    onChange: (event) => {
                                      const newSelectedDeclarationsTypes = new Set<DeclarationTypeSchemaType>(value);

                                      if (event.target.checked) {
                                        newSelectedDeclarationsTypes.add(declarationType);
                                      } else {
                                        newSelectedDeclarationsTypes.delete(declarationType);
                                      }

                                      onChange([...newSelectedDeclarationsTypes.values()]);
                                    },
                                    onBlur: onBlur,
                                  },
                                };
                              })}
                              orientation="vertical"
                            />
                          );
                        }}
                      />
                    </fieldset>
                    <fieldset className={fr.cx('fr-fieldset')}>
                      <div className={fr.cx('fr-fieldset__element')}>
                        <ul className={fr.cx('fr-btns-group')}>
                          <li>
                            <Button type="submit" loading={fillDeclaration.isPending}>
                              Enregistrer
                            </Button>
                          </li>
                          <li>
                            <Button
                              disabled={isDirty}
                              onClick={() => {
                                showConfirmationDialog({
                                  description: (
                                    <>
                                      Êtes-vous sûr de vouloir transmettre ces informations à la SACEM pour le spectacle{' '}
                                      <span className={fr.cx('fr-text--bold')} data-sentry-mask>
                                        {declaration.eventSerie.name}
                                      </span>{' '}
                                      ?
                                      <br />
                                      <br />
                                      <span style={{ fontStyle: 'italic' }}>
                                        Après envoi, aucune modification ne pourra être opérée depuis notre interface. Pour toute correction ou
                                        amendement de la déclaration, il faudra directement contacter votre interlocuteur SACEM.
                                      </span>
                                    </>
                                  ),
                                  onConfirm: async () => {
                                    const result = await transmitDeclaration.mutateAsync({
                                      eventSerieId: eventSerieId,
                                    });

                                    push(['trackEvent', 'declaration', 'transmit']);
                                  },
                                });
                              }}
                            >
                              Déclarer
                            </Button>
                          </li>
                        </ul>
                      </div>
                    </fieldset>
                    <fieldset className={fr.cx('fr-fieldset')}>
                      <h2 className={fr.cx('fr-h4')}>Représentations</h2>
                      <div className={fr.cx('fr-col-12')}>
                        <EventsFieldsets
                          control={control}
                          register={register}
                          setValue={setValue}
                          watch={watch}
                          trigger={trigger}
                          placeholder={declarationWrapper.placeholder}
                          errors={errors.events}
                          readonly={false}
                        />
                      </div>
                    </fieldset>
                    <fieldset className={fr.cx('fr-fieldset')}>
                      <h2 className={fr.cx('fr-h4')}>Général</h2>
                      <div className={fr.cx('fr-col-12')}>
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-7', 'fr-col-md-5')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Nom de la structure"
                                disabled
                                nativeInputProps={{
                                  value: declaration.organization.name,
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-5', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="SIRET"
                                disabled
                                nativeInputProps={{
                                  value: formatMaskedValue(officialHeadquartersIdMask, declaration.organization.officialHeadquartersId),
                                }}
                              />
                            </div>
                          </div>
                          {watch('eventSerie.expectedDeclarationTypes').includes('SACEM') && (
                            <div className={fr.cx('fr-col-6', 'fr-col-md-2')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="organization.sacemId"
                                  render={({ field, fieldState: { error } }) => {
                                    return <SacemIdInput {...field} label="Identifiant Sacem" errorMessage={error?.message} />;
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          {watch('eventSerie.expectedDeclarationTypes').includes('SACD') && (
                            <div className={fr.cx('fr-col-6', 'fr-col-md-2')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="organization.sacdId"
                                  render={({ field, fieldState: { error } }) => {
                                    return <SacdIdInput {...field} label="Identifiant SACD" errorMessage={error?.message} />;
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <hr className={fr.cx('fr-my-3v')} />
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.producer"
                                defaultValue={null}
                                render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                                  return (
                                    <CompanyField
                                      value={value}
                                      defaultSuggestions={declarationWrapper.placeholder.producer}
                                      inputProps={{
                                        label: 'Raison sociale du producteur',
                                        nativeInputProps: {
                                          placeholder: 'Recherche',
                                        },
                                      }}
                                      onChange={(newValue) => {
                                        onChange(newValue);
                                      }}
                                      onBlur={onBlur}
                                      errorMessage={error?.message}
                                    />
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Select
                                label="Genre"
                                state={!!errors.eventSerie?.performanceType ? 'error' : undefined}
                                stateRelatedMessage={errors?.eventSerie?.performanceType?.message}
                                nativeSelectProps={{
                                  ...register('eventSerie.performanceType'),
                                  defaultValue: control._defaultValues.eventSerie?.performanceType || '',
                                }}
                                options={[
                                  ...PerformanceTypeSchema.options.map((performanceType) => {
                                    return {
                                      label: t(`model.performanceType.enum.${performanceType}`),
                                      value: performanceType,
                                    };
                                  }),
                                ].sort((a, b) => a.label.localeCompare(b.label))}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-12', 'fr-col-md-7')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Date"
                                disabled
                                nativeInputProps={{
                                  value: `${t('date.long', { date: computedStartAt })}  →  ${t('date.long', {
                                    date: computedEndAt,
                                  })}`,
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Représentations"
                                disabled
                                nativeInputProps={{
                                  value: declaration.events.length,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <hr className={fr.cx('fr-my-3v')} />
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.place.name"
                                defaultValue={control._defaultValues.eventSerie?.place?.name ?? null}
                                render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                                  return (
                                    <Autocomplete
                                      disablePortal
                                      options={declarationWrapper.placeholder.place}
                                      value={value}
                                      renderInput={({ InputProps, disabled, id, inputProps }) => {
                                        return (
                                          <Input
                                            ref={InputProps.ref}
                                            label="Intitulé du lieu"
                                            id={id}
                                            disabled={disabled}
                                            state={!!error ? 'error' : undefined}
                                            stateRelatedMessage={error?.message}
                                            nativeInputProps={{
                                              ...inputProps,
                                              placeholder: 'Saisie ou recherche',
                                            }}
                                          />
                                        );
                                      }}
                                      renderOption={(props, option) => {
                                        const { key, ...otherProps } = props;

                                        return (
                                          <li key={key} {...otherProps} data-sentry-mask>
                                            <span className={fr.cx('fr-text--bold')}>{option.name}</span>
                                            &nbsp;
                                            <span style={{ fontStyle: 'italic' }}>
                                              (
                                              {addressFormatter
                                                .format({
                                                  street: option.address.street,
                                                  city: option.address.city,
                                                  postcode: option.address.postalCode,
                                                  state: option.address.subdivision,
                                                  countryCode: option.address.countryCode,
                                                })
                                                .trim()}
                                              )
                                            </span>
                                          </li>
                                        );
                                      }}
                                      isOptionEqualToValue={(option, value) => JSON.stringify(option) === JSON.stringify(value)} // TODO
                                      getOptionLabel={(option) => {
                                        if (typeof option === 'string') {
                                          // Value selected with enter, right from the input
                                          return option;
                                        } else {
                                          return option.name;
                                        }
                                      }}
                                      onInputChange={(event: React.SyntheticEvent<Element, Event>, newValue: string) => {
                                        setValue('eventSerie.place.name', newValue, { shouldDirty: true });
                                      }}
                                      onChange={(event, newValue) => {
                                        if (newValue) {
                                          if (typeof newValue === 'string') {
                                            onChange(newValue);
                                          } else {
                                            onChange(newValue.name);

                                            // Override the current address used
                                            setValue('eventSerie.place.address', newValue.address, { shouldDirty: true });
                                          }
                                        } else {
                                          setValue('eventSerie.place.name', null, { shouldDirty: true });
                                        }
                                      }}
                                      onBlur={onBlur}
                                      freeSolo
                                      selectOnFocus
                                      handleHomeEndKeys
                                      fullWidth
                                    />
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-8', 'fr-col-md-5')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.place.address"
                                defaultValue={null}
                                render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                                  return (
                                    <AddressField
                                      value={value}
                                      inputProps={{
                                        label: 'Adresse du lieu',
                                        nativeInputProps: {
                                          placeholder: 'Recherche',
                                        },
                                      }}
                                      onChange={(newValue) => {
                                        onChange(newValue);
                                      }}
                                      onBlur={onBlur}
                                      errorMessage={error?.message}
                                    />
                                  );
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-4', 'fr-col-md-2')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.placeCapacity"
                                defaultValue={control._defaultValues.eventSerie?.placeCapacity ?? 0}
                                render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                                  return (
                                    <Autocomplete
                                      options={declarationWrapper.placeholder.placeCapacity}
                                      freeSolo
                                      onBlur={onBlur}
                                      value={value ?? 0}
                                      onInputChange={(event, newValue, reason) => {
                                        onChange(parseInt(newValue, 10)); // Needed since underlying it's managing string only
                                      }}
                                      renderInput={({ InputProps, disabled, id, inputProps }) => {
                                        return (
                                          <Input
                                            ref={InputProps.ref}
                                            label="Jauge"
                                            id={id}
                                            disabled={disabled}
                                            state={!!error ? 'error' : undefined}
                                            stateRelatedMessage={error?.message}
                                            nativeInputProps={{
                                              ...inputProps,
                                              type: 'number',
                                              placeholder: '0',
                                              step: 1,
                                              min: 0,
                                              onWheel: (event) => {
                                                // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                                                // `event.currentTarget` is a callable type but is targetting the MUI element
                                                // whereas `event.target` targets the input element but does not have the callable type, so casting
                                                (event.target as HTMLInputElement).blur();
                                              },
                                            }}
                                          />
                                        );
                                      }}
                                      renderOption={(props, option) => {
                                        // Just needed for the Sentry mask
                                        return (
                                          <li {...props} key={option} data-sentry-mask>
                                            {option}
                                          </li>
                                        );
                                      }}
                                      getOptionLabel={(option) => {
                                        if (typeof option === 'string') {
                                          // Value selected with enter, right from the input
                                          return option;
                                        } else {
                                          return option.toString();
                                        }
                                      }}
                                    />
                                  );
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-8', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Select
                                label="Audience"
                                state={!!errors.eventSerie?.audience ? 'error' : undefined}
                                stateRelatedMessage={errors?.eventSerie?.audience?.message}
                                nativeSelectProps={{
                                  ...register('eventSerie.audience'),
                                  defaultValue: control._defaultValues.eventSerie?.audience || '',
                                }}
                                options={[
                                  ...AudienceSchema.options.map((audience) => {
                                    return {
                                      label: t(`model.audience.enum.${audience}`),
                                      value: audience,
                                    };
                                  }),
                                ].sort((a, b) => a.label.localeCompare(b.label))}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-4', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Select
                                label="Taux de TVA"
                                state={!!errors.eventSerie?.ticketingRevenueTaxRate ? 'error' : undefined}
                                stateRelatedMessage={errors?.eventSerie?.ticketingRevenueTaxRate?.message}
                                nativeSelectProps={{
                                  ...register('eventSerie.ticketingRevenueTaxRate', {
                                    valueAsNumber: true,
                                  }),
                                  defaultValue: (control._defaultValues.eventSerie?.ticketingRevenueTaxRate ?? currentTaxRates[0]).toString(),
                                }}
                                options={currentTaxRates.map((taxRate) => {
                                  return {
                                    label: t('number.percent', {
                                      percentage: taxRate,
                                    }),
                                    value: taxRate.toString(),
                                  };
                                })}
                              />
                            </div>
                          </div>
                        </div>
                        <hr className={fr.cx('fr-my-3v')} />
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Recette HT"
                                disabled
                                nativeInputProps={{
                                  value: t('currency.amount', {
                                    amount: eventsKeyFigures.ticketingRevenueExcludingTaxes,
                                  }),
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Recette TTC"
                                disabled
                                nativeInputProps={{
                                  value: t('currency.amount', {
                                    amount: eventsKeyFigures.ticketingRevenueIncludingTaxes,
                                  }),
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Entrées payantes"
                                disabled
                                nativeInputProps={{
                                  value: t('number.default', {
                                    number: eventsKeyFigures.paidTickets,
                                  }),
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Input
                                label="Entrées gratuites"
                                disabled
                                nativeInputProps={{
                                  value: t('number.default', {
                                    number: eventsKeyFigures.freeTickets,
                                  }),
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className={fr.cx('fr-grid-row')}>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.expensesExcludingTaxes"
                                render={({ field, fieldState: { error } }) => {
                                  return <AmountInput {...field} label="Dépenses globales HT" signed={false} errorMessage={error?.message} />;
                                }}
                              />
                            </div>
                          </div>
                          <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                            <div className={fr.cx('fr-fieldset__element')}>
                              <Controller
                                control={control}
                                name="eventSerie.introductionFeesExpensesExcludingTaxes"
                                render={({ field, fieldState: { error } }) => {
                                  return <AmountInput {...field} label="Frais d'approche HT" signed={false} errorMessage={error?.message} />;
                                }}
                              />
                            </div>
                          </div>
                          {watch('eventSerie.expectedDeclarationTypes').includes('SACD') && (
                            <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.circusSpecificExpensesExcludingTaxes"
                                  render={({ field, fieldState: { error } }) => {
                                    return (
                                      <AmountInput {...field} label="Frais spécifiques au cirque HT" signed={false} errorMessage={error?.message} />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </BaseForm>
              </div>
            </div>
          </>
        ) : (
          <div className={fr.cx('fr-col-12')}>Aucune représentation n'est associée à ce spectacle, il n'y a donc pas de déclaration à faire.</div>
        )}
      </div>
      {!!snackbarAlert && (
        <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={4000}>
          {snackbarAlert}
        </Snackbar>
      )}
    </div>
  );
}
