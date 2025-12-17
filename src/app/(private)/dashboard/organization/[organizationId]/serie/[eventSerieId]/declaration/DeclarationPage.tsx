'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import { Input } from '@codegouvfr/react-dsfr/Input';
import { createModal } from '@codegouvfr/react-dsfr/Modal';
import { Select } from '@codegouvfr/react-dsfr/SelectNext';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { cx } from '@codegouvfr/react-dsfr/tools/cx';
import { useIsDark } from '@codegouvfr/react-dsfr/useIsDark';
import addressFormatter from '@fragaria/address-formatter';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertProps, Autocomplete, Snackbar, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { push } from '@socialgouv/matomo-next';
import { TRPCClientErrorLike } from '@trpc/client';
import debounce from 'lodash.debounce';
import Image from 'next/image';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FieldPath, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { usePrevious } from 'react-use';
import { z } from 'zod';

import styles from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPage.module.scss';
import { DeclarationPageContext } from '@ad/src/app/(private)/dashboard/organization/[organizationId]/serie/[eventSerieId]/declaration/DeclarationPageContext';
import sending from '@ad/src/assets/images/declaration/sending.svg';
import { trpc } from '@ad/src/client/trpcClient';
import { AddressField } from '@ad/src/components/AddressField';
import { AmountInput } from '@ad/src/components/AmountInput';
import { BaseForm } from '@ad/src/components/BaseForm';
import { Button } from '@ad/src/components/Button';
import { CompanyField } from '@ad/src/components/CompanyField';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventsFieldsets } from '@ad/src/components/EventsFieldsets';
import { FileList } from '@ad/src/components/FileList';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { officialHeadquartersIdMask } from '@ad/src/components/OfficialHeadquartersIdField';
import { SacdIdInput } from '@ad/src/components/SacdIdField';
import { SacemIdInput } from '@ad/src/components/SacemIdField';
import { useConfirmationIfUnsavedChange } from '@ad/src/components/navigation/useConfirmationIfUnsavedChange';
import { currentTaxRates } from '@ad/src/core/declaration';
import { getEventsKeyFigures } from '@ad/src/core/declaration/format';
import { FillDeclarationSchema, FillDeclarationSchemaType, fillDeclarationAttachmentsMax } from '@ad/src/models/actions/declaration';
import { AddressInputSchemaType } from '@ad/src/models/entities/address';
import { AttachmentKindSchema, UiAttachmentSchemaType } from '@ad/src/models/entities/attachment';
import {
  DeclarationAttachmentTypeSchema,
  DeclarationAttachmentTypeSchemaType,
  DeclarationTypeSchema,
  DeclarationTypeSchemaType,
} from '@ad/src/models/entities/common';
import { BusinessZodError, atLeastOneTransmissionHasFailedError, invalidDeclarationFieldsToTransmitError } from '@ad/src/models/entities/errors';
import { AudienceSchema, PerformanceTypeSchema } from '@ad/src/models/entities/event';
import { AppRouter } from '@ad/src/server/app-router';
import { attachmentKindList } from '@ad/src/utils/attachment';
import { parseError } from '@ad/src/utils/error';
import { formatMaskedValue } from '@ad/src/utils/imask';
import { AggregatedQueries } from '@ad/src/utils/trpc';

type FillDeclarationSchemaInputType = z.input<typeof FillDeclarationSchema>;

type EnhancedUiAttachment = UiAttachmentSchemaType & {
  type: DeclarationAttachmentTypeSchemaType;
};

function sortAttachments(
  attachments: FillDeclarationSchemaInputType['eventSerie']['attachments']
): FillDeclarationSchemaInputType['eventSerie']['attachments'] {
  // For whatever reason with no interaction the array order between what is set inside `reset()`
  // and the form array is not the same whereas not doing any interaction that would modify it
  // ... so ending with sorting by ID for technical reasons
  return attachments.sort((a, b) => {
    return a.id.localeCompare(b.id);
  });
}

const declarationTypesModal = createModal({
  id: 'declaration-types-modal',
  isOpenedByDefault: false,
});

const transmissionConfirmationModal = createModal({
  id: 'transmission-confirmation-modal',
  isOpenedByDefault: false,
});

export interface DeclarationPageProps {
  params: { organizationId: string; eventSerieId: string };
}

export function DeclarationPage({ params: { organizationId, eventSerieId } }: DeclarationPageProps) {
  const { t } = useTranslation('common');
  const { ContextualUploader } = useContext(DeclarationPageContext);
  const { isDark } = useIsDark();

  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));

  const fillDeclaration = trpc.fillDeclaration.useMutation();
  const transmitDeclaration = trpc.transmitDeclaration.useMutation();

  const getDeclaration = trpc.getDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getDeclaration);

  const formContainerRef = useRef<HTMLFormElement | null>(null); // This is used to trigger the form submit with a button outside of it
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
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(FillDeclarationSchema),
    defaultValues: {
      eventSerieId: eventSerieId,
      organization: {
        sacemId: null,
        sacdId: null,
      },
      eventSerie: {
        producer: null,
        expectedDeclarationTypes: [],
        performanceType: null,
        place: {
          name: null,
          address: null,
        },
        placeCapacity: 0,
        audience: AudienceSchema.enum.ALL,
        ticketingRevenueTaxRate: currentTaxRates[0],
        expensesIncludingTaxes: 0,
        expensesExcludingTaxes: 0,
        expensesTaxRate: currentTaxRates[0],
        introductionFeesExpensesIncludingTaxes: 0,
        introductionFeesExpensesExcludingTaxes: 0,
        introductionFeesExpensesTaxRate: currentTaxRates[0],
        circusSpecificExpensesIncludingTaxes: 0,
        circusSpecificExpensesExcludingTaxes: 0,
        circusSpecificExpensesTaxRate: currentTaxRates[0],
        attachments: [],
      },
      events: [], // To avoid being "undefined"
      // ...prefill,
    },
  });

  // Due to the UI having tabs to switch between different declarations, we make sure the user is aware of loosing modifications
  useConfirmationIfUnsavedChange(isDirty);

  const onSubmit = useCallback(
    async (input: FillDeclarationSchemaType) => {
      // If modifying the declaration again we can get rid of any kept error from trying to declare
      setTransmitDeclarationMutationError(null);

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
          expensesIncludingTaxes: result.declaration.eventSerie.expensesIncludingTaxes,
          expensesExcludingTaxes: result.declaration.eventSerie.expensesExcludingTaxes,
          expensesTaxRate: result.declaration.eventSerie.expensesTaxRate,
          introductionFeesExpensesIncludingTaxes: result.declaration.eventSerie.introductionFeesExpensesIncludingTaxes,
          introductionFeesExpensesExcludingTaxes: result.declaration.eventSerie.introductionFeesExpensesExcludingTaxes,
          introductionFeesExpensesTaxRate: result.declaration.eventSerie.introductionFeesExpensesTaxRate,
          circusSpecificExpensesIncludingTaxes: result.declaration.eventSerie.circusSpecificExpensesIncludingTaxes,
          circusSpecificExpensesExcludingTaxes: result.declaration.eventSerie.circusSpecificExpensesExcludingTaxes,
          circusSpecificExpensesTaxRate: result.declaration.eventSerie.circusSpecificExpensesTaxRate,
          attachments: sortAttachments(
            result.declaration.eventSerie.attachments.map((uiAttachment) => {
              return {
                id: uiAttachment.id,
                type: uiAttachment.type,
              };
            })
          ),
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

      // From now use the informatinon from the backend instead of local ones (like for the preview URL being hosted instead of `blob://...`)
      // It allows making sure it's in sync with the backend, that's why below we replace the current array since everything should have been pushed to the backend
      setUiAttachments(result.declaration.eventSerie.attachments);

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
            expensesIncludingTaxes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expensesIncludingTaxes,
            expensesExcludingTaxes: getDeclaration.data.declarationWrapper.declaration.eventSerie.expensesExcludingTaxes,
            expensesTaxRate: getDeclaration.data.declarationWrapper.declaration.eventSerie.expensesTaxRate,
            introductionFeesExpensesIncludingTaxes:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.introductionFeesExpensesIncludingTaxes,
            introductionFeesExpensesExcludingTaxes:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.introductionFeesExpensesExcludingTaxes,
            introductionFeesExpensesTaxRate: getDeclaration.data.declarationWrapper.declaration.eventSerie.introductionFeesExpensesTaxRate,
            // To ease the user experience, make them 0 to avoid they fill it for SACD if not concerned
            circusSpecificExpensesIncludingTaxes:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.circusSpecificExpensesIncludingTaxes ?? 0,
            circusSpecificExpensesExcludingTaxes:
              getDeclaration.data.declarationWrapper.declaration.eventSerie.circusSpecificExpensesExcludingTaxes ?? 0,
            circusSpecificExpensesTaxRate: getDeclaration.data.declarationWrapper.declaration.eventSerie.circusSpecificExpensesTaxRate,
            attachments: sortAttachments(
              getDeclaration.data.declarationWrapper.declaration.eventSerie.attachments.map((uiAttachment) => {
                return {
                  id: uiAttachment.id,
                  type: uiAttachment.type,
                };
              })
            ),
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

        // Attachments in the UI have much more information than the ones needed by the mutation endpoint, so filling the intermediate variable
        setUiAttachments(getDeclaration.data.declarationWrapper.declaration.eventSerie.attachments);

        // If no declaration types we invite the user to select one through the window
        if (getDeclaration.data.declarationWrapper.declaration.eventSerie.expectedDeclarationTypes.length === 0) {
          // [WORKAROUND] The DSFR may not be initialized yet so opening the modal will throw an error reading on a null object
          // The idea is to mimic the logic of `react-dsfr` but to wait for the null object to be ready
          if ((window as any).dsfr) {
            const modalOpeningInterval = setInterval(() => {
              const modalElement = document.getElementById(declarationTypesModal.id);
              const dsfrReadyElement = (window as any).dsfr(modalElement);

              if (dsfrReadyElement) {
                clearInterval(modalOpeningInterval);

                declarationTypesModal.open();
              }
            }, 200);
          }
        }
      }
    }
  }, [getDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

  const expectedDeclarationTypes = watch('eventSerie.expectedDeclarationTypes');

  const [isUploadingAttachments, setIsUploadingAttachments] = useState<boolean>(false);
  const [uiAttachments, setUiAttachments] = useState<EnhancedUiAttachment[]>(() => []);

  useEffect(() => {
    // Make sure the data to be pushed reflects the list of uploaded items
    setValue(
      'eventSerie.attachments',
      sortAttachments(
        uiAttachments.map((uiAttachment) => {
          return {
            id: uiAttachment.id,
            type: uiAttachment.type,
          };
        })
      ),
      { shouldDirty: true }
    );
  }, [setValue, uiAttachments]);

  const onCommittedFilesChanged = useCallback<(attachments: UiAttachmentSchemaType[]) => Promise<void>>(
    async (committedUiAttachments) => {
      setUiAttachments((previousValue) => {
        const newValue = [...previousValue];

        committedUiAttachments.forEach((committedUiAttachment) => {
          if (newValue.findIndex((item) => item.id === committedUiAttachment.id) === -1) {
            newValue.push({
              ...committedUiAttachment,
              type: DeclarationAttachmentTypeSchema.enum.OTHER, // Default one that will is always forwarded to organisms, but can be more specific
            });
          }
        });

        return newValue;
      });
    },
    [setUiAttachments]
  );

  const [tmpExpectedDeclarationTypes, setTmpExpectedDeclarationTypes] = useState<DeclarationTypeSchemaType[]>([]);
  useEffect(() => {
    setTmpExpectedDeclarationTypes(expectedDeclarationTypes);
  }, [expectedDeclarationTypes, setTmpExpectedDeclarationTypes]);

  const [transmitDeclarationMutationError, setTransmitDeclarationMutationError] = useState<TRPCClientErrorLike<AppRouter> | Error | null>(null);

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

  // This is a workaround to not consider cloning main event serie values to events ones from the initial
  // `reset()` that sets values from the API response. Using the ref won't trigger useless rerender
  const formInitializedRef = useRef(false);
  useEffect(() => {
    if (!formInitializedRef.current && formInitialized) {
      setTimeout(() => {
        formInitializedRef.current = true;
      }, 1500); // ~1 second seems a good timing before any human interaction with inputs is possible
    }
  }, [formInitialized]);

  const debouncedDisplayDefaultImpactMessage = useMemo(() => debounce(displayDefaultImpactMessage, 1500), [displayDefaultImpactMessage]);
  useEffect(() => {
    return () => {
      debouncedDisplayDefaultImpactMessage.cancel();
    };
  }, [debouncedDisplayDefaultImpactMessage]);

  // Modifying a default property should impact events that had the same value as before modification
  const currentPlaceName = watch('eventSerie.place.name');
  const previousPlaceName = usePrevious(currentPlaceName);
  useEffect(() => {
    if (formInitializedRef.current && currentPlaceName !== previousPlaceName) {
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
    if (
      formInitializedRef.current &&
      (typeof currentPlaceAddress !== typeof previousPlaceAddress ||
        currentPlaceAddress?.street !== previousPlaceAddress?.street ||
        currentPlaceAddress?.city !== previousPlaceAddress?.city ||
        currentPlaceAddress?.postalCode !== previousPlaceAddress?.postalCode ||
        currentPlaceAddress?.subdivision !== previousPlaceAddress?.subdivision ||
        currentPlaceAddress?.countryCode !== previousPlaceAddress?.countryCode)
    ) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (
          event.placeOverride.address === null ||
          (typeof event.placeOverride.address === typeof previousPlaceAddress &&
            event.placeOverride.address?.street === previousPlaceAddress?.street &&
            event.placeOverride.address?.city === previousPlaceAddress?.city &&
            event.placeOverride.address?.postalCode === previousPlaceAddress?.postalCode &&
            event.placeOverride.address?.subdivision === previousPlaceAddress?.subdivision &&
            event.placeOverride.address?.countryCode === previousPlaceAddress?.countryCode)
        ) {
          setValue(`events.${eventIndex}.placeOverride.address`, currentPlaceAddress, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      debouncedDisplayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousPlaceAddress, currentPlaceAddress, getValues, setValue, debouncedDisplayDefaultImpactMessage]);

  const currentPlaceCapacity = watch('eventSerie.placeCapacity');
  const previousPlaceCapacity = usePrevious(currentPlaceCapacity);
  useEffect(() => {
    if (formInitializedRef.current && currentPlaceCapacity !== previousPlaceCapacity) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.placeCapacityOverride === null || event.placeCapacityOverride === previousPlaceCapacity) {
          setValue(`events.${eventIndex}.placeCapacityOverride`, currentPlaceCapacity, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      debouncedDisplayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousPlaceCapacity, currentPlaceCapacity, getValues, setValue, debouncedDisplayDefaultImpactMessage]);

  const currentAudience = watch('eventSerie.audience');
  const previousAudience = usePrevious(currentAudience);
  useEffect(() => {
    if (formInitializedRef.current && currentAudience !== previousAudience) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.audienceOverride === null || event.audienceOverride === previousAudience) {
          setValue(`events.${eventIndex}.audienceOverride`, currentAudience, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      debouncedDisplayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousAudience, currentAudience, getValues, setValue, debouncedDisplayDefaultImpactMessage]);

  const currentTicketingRevenueTaxRate = watch('eventSerie.ticketingRevenueTaxRate');
  const previousTicketingRevenueTaxRate = usePrevious(currentTicketingRevenueTaxRate);
  useEffect(() => {
    if (formInitializedRef.current && currentTicketingRevenueTaxRate !== previousTicketingRevenueTaxRate) {
      const events = getValues('events');
      let modifiedEvents = 0;

      events.forEach((event, eventIndex) => {
        if (event.ticketingRevenueTaxRateOverride === null || event.ticketingRevenueTaxRateOverride === previousTicketingRevenueTaxRate) {
          setValue(`events.${eventIndex}.ticketingRevenueTaxRateOverride`, currentTicketingRevenueTaxRate, { shouldDirty: true });
          modifiedEvents++;
        }
      });

      debouncedDisplayDefaultImpactMessage(modifiedEvents, events.length);
    }
  }, [previousTicketingRevenueTaxRate, currentTicketingRevenueTaxRate, getValues, setValue, debouncedDisplayDefaultImpactMessage]);

  const { alreadyDeclared, erroredTransmission } = useMemo(() => {
    return getDeclaration.data
      ? {
          alreadyDeclared: getDeclaration.data.declarationWrapper.transmissions.length > 0,
          erroredTransmission:
            getDeclaration.data.declarationWrapper.transmissions.findIndex(
              (transmission) => transmission.status === 'PENDING' && transmission.hasError
            ) !== -1,
        }
      : {
          alreadyDeclared: false,
          erroredTransmission: false,
        };
  }, [getDeclaration]);

  const formAttachments = watch('eventSerie.attachments');
  const fileItemAdditionalSectionRenderer = useCallback(
    (file: EnhancedUiAttachment) => {
      const fileIndex = formAttachments.findIndex((eA) => eA.id === file.id);

      return (
        <>
          <Select
            label=""
            disabled={alreadyDeclared}
            state={!!errors.eventSerie?.attachments?.[fileIndex]?.type ? 'error' : undefined}
            stateRelatedMessage={errors?.eventSerie?.attachments?.[fileIndex]?.type?.message}
            nativeSelectProps={{
              'aria-label': 'type de document',
              value: file.type,
              onChange: (event) => {
                // Updating this array will also affect the form values
                // Note: it will rerender this select at each modification but we have no other choice due to order of the source of truth
                setUiAttachments((previousValue) => {
                  const newUiAttachments = [...previousValue];
                  const currentFile = newUiAttachments.find((item) => item.id === file.id);

                  if (currentFile) {
                    currentFile.type = event.target.value;
                  }

                  return newUiAttachments;
                });
              },
              style: {
                fontSize: '0.8rem',
                lineHeight: '1rem',
                padding: '0.5rem 1.5rem 0.5rem 0.5rem',
                backgroundPosition: 'calc(100% - 0.25rem) 50%',
                marginLeft: '1.5rem',
              },
            }}
            options={[
              ...DeclarationAttachmentTypeSchema.options.map((attachmentType) => {
                return {
                  label: t(`model.declarationAttachmentType.enum.${attachmentType}`),
                  value: attachmentType,
                };
              }),
            ].sort((a, b) => a.label.localeCompare(b.label))}
            style={{
              maxWidth: '40%',
              marginRight: '1rem',
              marginLeft: 'auto',
              marginBottom: 0,
            }}
          />
        </>
      );
    },
    [formAttachments, alreadyDeclared, setUiAttachments, errors.eventSerie?.attachments, t]
  );

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

  const declarationWrapper = getDeclaration.data!.declarationWrapper;
  const declaration = declarationWrapper.declaration;

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 450,
          backgroundColor: fr.colors.decisions.background.actionLow.blueFrance.default,
        }}
      >
        <div
          className={fr.cx('fr-container', 'fr-py-6v')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem 2rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0rem 1rem' }}>
              <h1 className={fr.cx('fr-h3', 'fr-mb-2v')} data-sentry-mask>
                {declaration.eventSerie.name}
              </h1>
              {/*
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {expectedDeclarationTypes.map((declarationType) => {
                  return (
                    <Tag
                      key={declarationType}
                      {...((declarationWrapper.transmissions.findIndex(
                        (transmission) => transmission.type === declarationType && transmission.status === 'PROCESSED'
                      ) !== -1
                        ? {
                            iconId: fr.cx('fr-icon-checkbox-circle-line'),
                          }
                        : {}) as any)}
                    >
                      {t(`model.declarationType.enum.${declarationType}`)}
                    </Tag>
                  );
                })}
                {!alreadyDeclared && (
                  <Tag
                    iconId="fr-icon-add-circle-line"
                    linkProps={{
                      href: '#',
                      onClick: declarationTypesModal.open,
                    }}
                  >
                    Éditer
                  </Tag>
                )}
              </div>
               */}
            </div>
            <div className={fr.cx('fr-mt-1v')}>
              {alreadyDeclared ? (
                <>
                  {erroredTransmission
                    ? "La télédéclaration ne s'est pas faite correctement, veuillez retenter."
                    : 'La déclaration a correctement été transmise.'}
                </>
              ) : (
                <>Vérifiez et complétez les informations pour déclarer ce spectacle.</>
              )}
            </div>
          </div>
          {(!alreadyDeclared || erroredTransmission) && (
            <ul className={fr.cx('fr-btns-group', 'fr-btns-group--inline')} style={{ marginLeft: 'auto' }}>
              {!alreadyDeclared && (
                <li>
                  <Button
                    onClick={() => {
                      formContainerRef.current?.requestSubmit();
                    }}
                    priority="secondary"
                    disabled={transmitDeclaration.isPending || isUploadingAttachments}
                    loading={fillDeclaration.isPending}
                    nativeButtonProps={{
                      className: fr.cx('fr-m-2v'),
                    }}
                  >
                    Enregistrer
                  </Button>
                </li>
              )}
              <li>
                <Tooltip title={isDirty ? `Pour télédéclarer vous devez d'abord enregistrer vos dernières modifications` : ''}>
                  <span>
                    <Button
                      disabled={isDirty || fillDeclaration.isPending || isUploadingAttachments}
                      loading={transmitDeclaration.isPending}
                      onClick={async () => {
                        try {
                          const result = await transmitDeclaration.mutateAsync({
                            eventSerieId: eventSerieId,
                          });

                          // If an error was here remove it since successful
                          setTransmitDeclarationMutationError(null);

                          transmissionConfirmationModal.open();
                        } catch (error) {
                          if (error instanceof Error) {
                            const parsedError = parseError(error);

                            setTransmitDeclarationMutationError(error);

                            // It's taken into account an additional backend verification may fail when ensuring data will pass for each
                            // chosen organisms... since it has the same structure than the `fillDeclaration` we patch errors onto the right fields
                            // (still throwing the original issue so the `ErrorAlert` within the modal will display correctly)
                            // Note: previous errors will be clean here (since the field would be missing in the array), how if using `fillDeclaration` it will clear them automatically
                            if (parsedError instanceof BusinessZodError && parsedError.code === invalidDeclarationFieldsToTransmitError.code) {
                              clearErrors();

                              for (const issue of parsedError.zodError) {
                                let field = issue.path.join('.') as FieldPath<FillDeclarationSchemaInputType>;

                                // The `DeclarationSchema` is not exactly the same than `FillDeclarationSchema` so we hack
                                // a bit the field names to place at the right locations (this is mainly due for associations inputs)
                                // Note: error message may not be perfect but often it's due to missing property with `invalid_type` so it's acceptable to have a message really specific to this case
                                // (since otherwise this error should not happen from the UI in the normal flow)
                                if ((field as string) === 'eventSerie.place') {
                                  field = 'eventSerie.place.name';
                                } else if ((field as string).endsWith('.eventSerie.place')) {
                                  field = field.replace(
                                    '.placeOverride',
                                    '.eventSerie.placeOverride.name'
                                  ) as FieldPath<FillDeclarationSchemaInputType>;
                                } else if ((field as string) === 'eventSerie.producerOfficialId') {
                                  field = 'eventSerie.producer';
                                } else if ((field as string) === 'eventSerie.producerName') {
                                  field = 'eventSerie.producer'; // The above error about producer should aways be the one since they go by pair
                                }

                                setError(field, {
                                  type: 'validate',
                                  message: issue.message,
                                });
                              }
                            }
                          }

                          throw error;
                        } finally {
                          // If something has been transferred to an organism we make all the data immutable
                          // Since the `transmitDeclaration` endpoint won't return about the state of all pending declarations
                          // we make sure the global getter will, to make disabled all the form, but also to display the global error
                          // Note: error from `transmitDeclaration` can colocate with the one of the failed declaration from the getter, but we are fine for now with it since no other proposition
                          getDeclaration.refetch(); // No need to be async since that's just for UI refresh
                        }

                        push(['trackEvent', 'declaration', 'transmit']);
                      }}
                      nativeButtonProps={{
                        className: fr.cx('fr-m-2v'),
                      }}
                    >
                      {erroredTransmission ? 'Réessayer de déclarer' : 'Déclarer'}
                    </Button>
                  </span>
                </Tooltip>
              </li>
            </ul>
          )}
        </div>
      </div>
      <div className={fr.cx('fr-container', 'fr-py-12v')} style={{ height: '100%' }}>
        <div className={fr.cx('fr-grid-row', 'fr-grid-row--gutters')} style={{ height: '100%' }}>
          {declaration.events.length > 0 ? (
            <>
              <div className={fr.cx('fr-col-12')}>
                <div className={fr.cx('fr-col-12')}>
                  <BaseForm
                    handleSubmit={handleSubmit}
                    onSubmit={onSubmit}
                    control={control}
                    ariaLabel="connecter un système de billetterie"
                    innerRef={formContainerRef}
                    style={{
                      // When scrolling to the beginning of the form the error alert will be hidden by the sticky event serie element, so we use CSS to shift a bit the Y target position
                      scrollMarginTop: smUp ? 200 : 320,
                    }}
                  >
                    <div className={fr.cx('fr-col-12')}>
                      <fieldset className={fr.cx('fr-fieldset')}>
                        {transmitDeclarationMutationError && (
                          <div className={fr.cx('fr-fieldset__element', 'fr-mb-8v')}>
                            <ErrorAlert errors={[transmitDeclarationMutationError]} />
                          </div>
                        )}
                        {erroredTransmission && (
                          <div className={fr.cx('fr-fieldset__element', 'fr-mb-8v')}>
                            <ErrorAlert errors={[atLeastOneTransmissionHasFailedError]} />
                          </div>
                        )}
                        <div className={fr.cx('fr-fieldset__element')}>
                          <h2 className={fr.cx('fr-h4')}>Général</h2>
                        </div>
                        <div className={fr.cx('fr-col-12')}>
                          <div className={fr.cx('fr-grid-row')}>
                            {/*
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
                           */}
                            {expectedDeclarationTypes.includes('SACEM') && (
                              <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                                <div className={fr.cx('fr-fieldset__element')}>
                                  <Controller
                                    control={control}
                                    name="organization.sacemId"
                                    disabled={alreadyDeclared}
                                    render={({ field, fieldState: { error } }) => {
                                      return <SacemIdInput {...field} label="Identifiant SACEM" errorMessage={error?.message} />;
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                            {expectedDeclarationTypes.includes('SACD') && (
                              <div className={fr.cx('fr-col-6', 'fr-col-md-3')}>
                                <div className={fr.cx('fr-fieldset__element')}>
                                  <Controller
                                    control={control}
                                    name="organization.sacdId"
                                    disabled={alreadyDeclared}
                                    render={({ field, fieldState: { error } }) => {
                                      return <SacdIdInput {...field} label="Identifiant SACD" errorMessage={error?.message} />;
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          <div className={fr.cx('fr-grid-row')}>
                            <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Select
                                  label="Esthétique du spectacle"
                                  disabled={alreadyDeclared}
                                  state={!!errors.eventSerie?.performanceType ? 'error' : undefined}
                                  stateRelatedMessage={errors?.eventSerie?.performanceType?.message}
                                  nativeSelectProps={{
                                    ...register('eventSerie.performanceType'),
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
                            <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.producer"
                                  disabled={alreadyDeclared}
                                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                                    return (
                                      <CompanyField
                                        value={value}
                                        defaultSuggestions={declarationWrapper.placeholder.producer}
                                        inputProps={{
                                          label: 'Raison sociale du producteur',
                                          disabled: disabled,
                                          nativeInputProps: {
                                            placeholder: 'Recherche par nom ou SIREN',
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
                            {/*
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
                           */}
                          </div>
                          {/*
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
                        */}
                          <div className={fr.cx('fr-grid-row')}>
                            <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.introductionFeesExpensesExcludingTaxes"
                                  disabled={alreadyDeclared}
                                  render={({ field, fieldState: { error } }) => {
                                    return (
                                      <AmountInput
                                        {...field}
                                        label="Frais d'approche HT"
                                        hintText="Hébergement et transport (artistes, techniciens, matériel, décor...)"
                                        signed={false}
                                        errorMessage={error?.message}
                                      />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                            <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.introductionFeesExpensesIncludingTaxes"
                                  disabled={alreadyDeclared}
                                  render={({ field, fieldState: { error } }) => {
                                    return (
                                      <AmountInput
                                        {...field}
                                        label="Frais d'approche TTC"
                                        hintText="Hébergement et transport (artistes, techniciens, matériel, décor...)"
                                        signed={false}
                                        errorMessage={error?.message}
                                      />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                            {expectedDeclarationTypes.includes('SACD') && (
                              <>
                                <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                                  <div className={fr.cx('fr-fieldset__element')}>
                                    <Controller
                                      control={control}
                                      name="eventSerie.circusSpecificExpensesExcludingTaxes"
                                      disabled={alreadyDeclared}
                                      render={({ field, fieldState: { error } }) => {
                                        return (
                                          <AmountInput
                                            {...field}
                                            label="Frais spécifiques au cirque HT"
                                            hintText="Transport, montage, démontage"
                                            signed={false}
                                            errorMessage={error?.message}
                                          />
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                                  <div className={fr.cx('fr-fieldset__element')}>
                                    <Controller
                                      control={control}
                                      name="eventSerie.circusSpecificExpensesIncludingTaxes"
                                      disabled={alreadyDeclared}
                                      render={({ field, fieldState: { error } }) => {
                                        return (
                                          <AmountInput
                                            {...field}
                                            label="Frais spécifiques au cirque TTC"
                                            hintText="Transport, montage, démontage"
                                            signed={false}
                                            errorMessage={error?.message}
                                          />
                                        );
                                      }}
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                            <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.expensesExcludingTaxes"
                                  disabled={alreadyDeclared}
                                  render={({ field, fieldState: { error } }) => {
                                    return (
                                      <AmountInput
                                        {...field}
                                        label="Dépenses totales HT"
                                        hintText="Somme de tous les contrats artistiques et frais d'approche"
                                        signed={false}
                                        errorMessage={error?.message}
                                      />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                            <div className={fr.cx('fr-col-6', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.expensesIncludingTaxes"
                                  disabled={alreadyDeclared}
                                  render={({ field, fieldState: { error } }) => {
                                    return (
                                      <AmountInput
                                        {...field}
                                        label="Dépenses totales TTC"
                                        hintText="Somme de tous les contrats artistiques et frais d'approche"
                                        signed={false}
                                        errorMessage={error?.message}
                                      />
                                    );
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          {(expectedDeclarationTypes.includes('SACEM') || expectedDeclarationTypes.includes('SACD')) && (
                            <div className={fr.cx('fr-grid-row')}>
                              <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                                <div className={fr.cx('fr-fieldset__element')}>
                                  <span className={fr.cx('fr-text--bold')}>Pièces justificatives :</span>
                                  <br />
                                  {expectedDeclarationTypes.includes('SACEM') ? (
                                    <>
                                      <ol>
                                        <li>contrats artistiques (cession & co-réalisation)</li>
                                        <li>programme œuvres interprétées</li>
                                        <li>bordereau de recette</li>
                                      </ol>
                                    </>
                                  ) : (
                                    <>contrats artistiques (cession, co-réalisation, co-production)</>
                                  )}
                                </div>
                              </div>
                              <div className={fr.cx('fr-col-12', 'fr-col-md-7')}>
                                <div className={fr.cx('fr-fieldset__element')}>
                                  {!alreadyDeclared && (
                                    <ContextualUploader
                                      attachmentKindRequirements={attachmentKindList[AttachmentKindSchema.enum.EVENT_SERIE_DOCUMENT]}
                                      maxFiles={fillDeclarationAttachmentsMax}
                                      onCommittedFilesChanged={onCommittedFilesChanged}
                                      isUploadingChanged={(newValue) => {
                                        setIsUploadingAttachments(newValue);
                                      }}
                                      listStyle={{ paddingBottom: 0 }} // Since they are stack with the "uploaded files list" we prevent double spacing
                                    />
                                  )}
                                  {uiAttachments && uiAttachments.length > 0 && (
                                    <>
                                      <FileList
                                        files={uiAttachments}
                                        onRemove={async (file) => {
                                          const newValue = [...uiAttachments];
                                          const existingIndex = newValue.findIndex((item) => item.id === file.id);

                                          if (existingIndex !== -1) {
                                            newValue.splice(existingIndex, 1);
                                          }

                                          setUiAttachments(newValue);
                                        }}
                                        additionalSection={fileItemAdditionalSectionRenderer}
                                        readonly={alreadyDeclared}
                                        style={{ paddingTop: 0 }} // Since they are stack with the "uploader files list" we prevent double spacing
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <div className={fr.cx('fr-fieldset__element')}>
                            <hr className={cx(fr.cx('fr-my-3v'), styles.hr)} />
                          </div>
                          <div className={fr.cx('fr-grid-row')}>
                            <div className={fr.cx('fr-col-12')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <p className={fr.cx('fr-mb-8v')} style={{ color: fr.colors.decisions.border.default.blueFrance.default }}>
                                  Ces informations sont reportées sur toutes les séances, vous pouvez toujours les modifier pour chaque séance.
                                </p>
                              </div>
                            </div>
                            <div className={fr.cx('fr-col-8', 'fr-col-md-3')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Select
                                  label="Type de public"
                                  disabled={alreadyDeclared}
                                  state={!!errors.eventSerie?.audience ? 'error' : undefined}
                                  stateRelatedMessage={errors?.eventSerie?.audience?.message}
                                  nativeSelectProps={{
                                    ...register('eventSerie.audience'),
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
                                  label="Taux de TVA de la billetterie"
                                  disabled={alreadyDeclared}
                                  state={!!errors.eventSerie?.ticketingRevenueTaxRate ? 'error' : undefined}
                                  stateRelatedMessage={errors?.eventSerie?.ticketingRevenueTaxRate?.message}
                                  nativeSelectProps={{
                                    ...register('eventSerie.ticketingRevenueTaxRate', {
                                      valueAsNumber: true,
                                    }),
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
                          <div className={fr.cx('fr-grid-row')}>
                            <div className={fr.cx('fr-col-12', 'fr-col-md-5')}>
                              <div className={fr.cx('fr-fieldset__element')}>
                                <Controller
                                  control={control}
                                  name="eventSerie.place.name"
                                  disabled={alreadyDeclared}
                                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                                    return (
                                      <Autocomplete
                                        disablePortal
                                        options={declarationWrapper.placeholder.place}
                                        value={value}
                                        inputValue={value ?? ''}
                                        disabled={disabled}
                                        renderInput={({ InputProps, disabled, id, inputProps }) => {
                                          return (
                                            <Input
                                              ref={InputProps.ref}
                                              label="Intitulé du lieu de la représentation"
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

                                              const { id, ...newAddressInputValue } = newValue.address;

                                              // Override the current address used
                                              setValue('eventSerie.place.address', newAddressInputValue, { shouldDirty: true });
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
                                  disabled={alreadyDeclared}
                                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                                    return (
                                      <AddressField
                                        value={value}
                                        inputProps={{
                                          label: 'Adresse du lieu',
                                          disabled: disabled,
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
                                  disabled={alreadyDeclared}
                                  render={({ field: { onChange, onBlur, value, ref, disabled }, fieldState: { error }, formState }) => {
                                    return (
                                      <Autocomplete
                                        options={declarationWrapper.placeholder.placeCapacity}
                                        freeSolo
                                        onBlur={onBlur}
                                        value={value}
                                        inputValue={value ? value.toString() : ''}
                                        disabled={disabled}
                                        onInputChange={(event, newValue, reason) => {
                                          const parsedValue = parseInt(newValue, 10);

                                          // The check is needed because the input value can be an empty string
                                          onChange(!isNaN(parsedValue) ? parsedValue : null);
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
                                                onFocusCapture: (event) => {
                                                  event.target.select(); // For the ease of modification select the whole on focus
                                                },
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
                        </div>
                      </fieldset>
                      <fieldset className={fr.cx('fr-fieldset')}>
                        <div className={fr.cx('fr-col-12')}>
                          <div className={fr.cx('fr-fieldset__element')}>
                            <hr className={cx(fr.cx('fr-my-3v'), styles.hr)} />
                          </div>
                          <EventsFieldsets
                            control={control}
                            register={register}
                            setValue={setValue}
                            watch={watch}
                            trigger={trigger}
                            placeholder={declarationWrapper.placeholder}
                            eventSerieManuallyCreated={declarationWrapper.ticketingSystemName === 'MANUAL'}
                            errors={errors.events}
                            readonly={alreadyDeclared}
                          />
                        </div>
                      </fieldset>
                    </div>
                  </BaseForm>
                  <declarationTypesModal.Component
                    title="Paramètres de déclaration"
                    concealingBackdrop={false}
                    className={styles.declarationTypesModal}
                    buttons={[
                      {
                        doClosesModal: true,
                        disabled: tmpExpectedDeclarationTypes.length === 0,
                        children: "C'est parti !",
                        onClick: () => {
                          setValue(`eventSerie.expectedDeclarationTypes`, tmpExpectedDeclarationTypes, {
                            shouldDirty: true,
                          });
                        },
                      },
                    ]}
                  >
                    <Controller
                      control={control}
                      name="eventSerie.expectedDeclarationTypes"
                      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
                        return (
                          <Checkbox
                            legend={
                              <h1 className={fr.cx('fr-h4')} style={{ fontWeight: '400px !important' }}>
                                Auprès de quels <span className={fr.cx('fr-text--bold')}>organismes devez-vous déclarer ?</span>
                              </h1>
                            }
                            state={!!error ? 'error' : undefined}
                            stateRelatedMessage={error?.message}
                            options={DeclarationTypeSchema.options.map((declarationType) => {
                              return {
                                label: (
                                  <div>
                                    {t(`model.declarationType.enum.${declarationType}`)}
                                    <div style={{ color: fr.colors.decisions.text.mention.grey.default }}>
                                      {declarationType === 'SACEM' && 'spectacles avec musique protégée'}
                                      {declarationType === 'SACD' && 'spectacles avec texte, scénario ou chorégraphie protégés'}
                                    </div>
                                  </div>
                                ),
                                nativeInputProps: {
                                  name: `checkbox-${declarationType}`,
                                  value: declarationType,
                                  // checked: value.includes(declarationType),
                                  checked: tmpExpectedDeclarationTypes.includes(declarationType),
                                  onChange: (event) => {
                                    // const newSelectedDeclarationsTypes = new Set<DeclarationTypeSchemaType>(value);
                                    const newSelectedDeclarationsTypes = new Set<DeclarationTypeSchemaType>(tmpExpectedDeclarationTypes);

                                    if (event.target.checked) {
                                      newSelectedDeclarationsTypes.add(declarationType);
                                    } else {
                                      newSelectedDeclarationsTypes.delete(declarationType);
                                    }

                                    // Must be validated by the
                                    // onChange([...newSelectedDeclarationsTypes.values()]);
                                    setTmpExpectedDeclarationTypes([...newSelectedDeclarationsTypes.values()]);
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
                  </declarationTypesModal.Component>
                  <transmissionConfirmationModal.Component
                    title="Déclaration transmise"
                    className={styles.transmissionConfirmationModal}
                    buttons={[
                      {
                        doClosesModal: true,
                        children: 'Ok',
                      },
                    ]}
                  >
                    <div>
                      <div>
                        <Image
                          src={sending}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            filter: isDark ? 'invert(100%)' : undefined,
                          }}
                        />
                      </div>
                      <div>
                        <p className={fr.cx('fr-text--lead')}>
                          {t('components.DeclarationPage.sent_declaration_to_organism', {
                            count: expectedDeclarationTypes.length,
                          })}
                        </p>
                        <p className={fr.cx('fr-mb-0')}>
                          {t('components.DeclarationPage.possible_information_request_from_organism', {
                            count: expectedDeclarationTypes.length,
                          })}
                        </p>
                      </div>
                    </div>
                  </transmissionConfirmationModal.Component>
                </div>
              </div>
            </>
          ) : (
            <div className={fr.cx('fr-col-12')}>
              Aucune représentation n&apos;est associée à ce spectacle, il n&apos;y a donc pas de déclaration à faire.
            </div>
          )}
        </div>
        {!!snackbarAlert && (
          <Snackbar open onClose={handleCloseSnackbar} autoHideDuration={4000}>
            {snackbarAlert}
          </Snackbar>
        )}
      </div>
    </div>
  );
}
