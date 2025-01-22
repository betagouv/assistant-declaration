'use client';

import { fr } from '@codegouvfr/react-dsfr';
import { zodResolver } from '@hookform/resolvers/zod';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { LoadingButton as Button } from '@mui/lab';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Chip,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import diff from 'microdiff';
import NextLink from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { trpc } from '@ad/src/client/trpcClient';
import { BaseForm } from '@ad/src/components/BaseForm';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { EventSalesTable } from '@ad/src/components/EventSalesTable';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { SacdAccountingEntriesTable } from '@ad/src/components/SacdAccountingEntriesTable';
import { SacdOrganizationFields } from '@ad/src/components/SacdOrganizationFields';
import { SacdPerformedWorksTable } from '@ad/src/components/SacdPerformedWorksTable';
import { SacdTicketingEntriesTable } from '@ad/src/components/SacdTicketingEntriesTable';
import { useSingletonConfirmationDialog } from '@ad/src/components/modal/useModal';
import { FillSacdDeclarationSchema, FillSacdDeclarationSchemaType } from '@ad/src/models/actions/declaration';
import { DeclarationTypeSchema } from '@ad/src/models/entities/common';
import { SacdAudienceSchema, SacdProductionTypeSchema } from '@ad/src/models/entities/declaration/sacd';
import { currencyFormatter, currencyFormatterWithNoDecimals } from '@ad/src/utils/currency';
import { capitalizeFirstLetter } from '@ad/src/utils/format';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';
import { AggregatedQueries } from '@ad/src/utils/trpc';
import { getBaseUrl } from '@ad/src/utils/url';

export interface SacdDeclarationPageProps {
  params: { eventSerieId: string };
}

export function SacdDeclarationPage({ params: { eventSerieId } }: SacdDeclarationPageProps) {
  const { t } = useTranslation('common');

  const updateEventCategoryTickets = trpc.updateEventCategoryTickets.useMutation();
  const fillSacdDeclaration = trpc.fillSacdDeclaration.useMutation();

  const getEventSerie = trpc.getEventSerie.useQuery({
    id: eventSerieId,
  });

  const listEvents = trpc.listEvents.useQuery({
    orderBy: {},
    filterBy: {
      eventSeriesIds: [eventSerieId],
    },
  });

  const getSacdDeclaration = trpc.getSacdDeclaration.useQuery({
    eventSerieId: eventSerieId,
  });

  const aggregatedQueries = new AggregatedQueries(getEventSerie, listEvents, getSacdDeclaration);

  const [formInitialized, setFormInitialized] = useState<boolean>(false);
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>([]);
  const collapseAllAccordions = useCallback(() => setExpandedAccordions([]), []);
  const expandAllAccordions = useCallback(() => setExpandedAccordions(listEvents.data!.eventsWrappers.map((eW) => eW.event.id)), [listEvents.data]);
  const [producerSameThanOrganizer, setProducerSameThanOrganizer] = useState<boolean | null>(null);
  const [rightsFeesManagerSameThan, setRightsFeesManagerSameThan] = useState<'organizer' | 'producer' | 'none' | null>(null);

  const { showConfirmationDialog } = useSingletonConfirmationDialog();

  const {
    handleSubmit,
    formState: { errors, isDirty },
    getValues,
    setValue,
    watch,
    control,
    trigger,
    reset,
  } = useForm<FillSacdDeclarationSchemaType>({
    resolver: zodResolver(FillSacdDeclarationSchema),
    defaultValues: {
      // ...prefill,
      eventSerieId: eventSerieId,
    }, // The rest will be set with data fetched
  });

  const preHandleSubmit: typeof handleSubmit = useCallback(
    (onValid, onInvalid) => {
      // Before validating locally the fields we make sure to apply the mirors if any
      if (producerSameThanOrganizer) {
        setValue('producer', getValues('organizer'), { shouldValidate: true });
      }

      if (rightsFeesManagerSameThan === 'organizer') {
        setValue('rightsFeesManager', getValues('organizer'), { shouldValidate: true });
      } else if (rightsFeesManagerSameThan === 'producer') {
        setValue('rightsFeesManager', getValues('producer'), { shouldValidate: true });
      }

      return handleSubmit(onValid, onInvalid);
    },
    [handleSubmit, getValues, setValue, producerSameThanOrganizer, rightsFeesManagerSameThan]
  );

  const onSubmit = useCallback(
    async (input: FillSacdDeclarationSchemaType) => {
      const result = await fillSacdDeclaration.mutateAsync(input);

      // To not have the "id" key
      const { id: id1, ...organizerPhone } = result.sacdDeclaration.organizer.phone;
      const { id: id2, ...organizerAddress } = result.sacdDeclaration.organizer.headquartersAddress;
      const { id: id3, ...producerPhone } = result.sacdDeclaration.producer.phone;
      const { id: id4, ...producerAddress } = result.sacdDeclaration.producer.headquartersAddress;
      const { id: id5, ...rightsFeesManagerPhone } = result.sacdDeclaration.rightsFeesManager.phone;
      const { id: id6, ...rightsFeesManagerAddress } = result.sacdDeclaration.rightsFeesManager.headquartersAddress;

      const organizer = {
        ...result.sacdDeclaration.organizer,
        phone: organizerPhone,
        headquartersAddress: organizerAddress,
      };
      const producer = {
        ...result.sacdDeclaration.producer,
        phone: producerPhone,
        headquartersAddress: producerAddress,
      };
      const rightsFeesManager = {
        ...result.sacdDeclaration.rightsFeesManager,
        phone: rightsFeesManagerPhone,
        headquartersAddress: rightsFeesManagerAddress,
      };

      // Reset the form state so fields considered as "dirty" are no longer
      reset({
        eventSerieId: eventSerieId,
        clientId: result.sacdDeclaration.clientId,
        officialHeadquartersId: result.sacdDeclaration.officialHeadquartersId,
        productionOperationId: result.sacdDeclaration.productionOperationId,
        productionType: result.sacdDeclaration.productionType,
        placeName: result.sacdDeclaration.placeName,
        placePostalCode: result.sacdDeclaration.placePostalCode,
        placeCity: result.sacdDeclaration.placeCity,
        audience: result.sacdDeclaration.audience,
        placeCapacity: result.sacdDeclaration.placeCapacity,
        accountingEntries: result.sacdDeclaration.accountingEntries,
        organizer: organizer,
        producer: producer,
        rightsFeesManager: rightsFeesManager,
        performedWorks: result.sacdDeclaration.performedWorks,
        declarationPlace: result.sacdDeclaration.declarationPlace,
      });

      // Just in case readjust booleans if something has changed by another tab
      const organizerProducerDiff = diff(result.sacdDeclaration.organizer, result.sacdDeclaration.producer);
      const producerRightsFeesManagerDiff = diff(result.sacdDeclaration.producer, result.sacdDeclaration.rightsFeesManager);
      const organizerRightsFeesManagerDiff = diff(result.sacdDeclaration.organizer, result.sacdDeclaration.rightsFeesManager);

      setProducerSameThanOrganizer(organizerProducerDiff.length === 0);
      setRightsFeesManagerSameThan(
        // Here by default we set "organizer" if "producer" is also the same
        organizerRightsFeesManagerDiff.length === 0 ? 'organizer' : producerRightsFeesManagerDiff.length === 0 ? 'producer' : 'none'
      );
    },
    [fillSacdDeclaration, reset, eventSerieId]
  );

  useEffect(() => {
    if (!formInitialized && getSacdDeclaration.data) {
      setFormInitialized(true); // It's needed otherwise if you blur/focus again the window the new fetch data will override the "dirty form data"

      // Update the form with fetched data
      if (getSacdDeclaration.data.sacdDeclarationWrapper.declaration) {
        // To not have the "id" key
        const { id: id1, ...organizerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer.phone;
        const { id: id2, ...organizerAddress } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer.headquartersAddress;
        const { id: id3, ...producerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer.phone;
        const { id: id4, ...producerAddress } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer.headquartersAddress;
        const { id: id5, ...rightsFeesManagerPhone } = getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager.phone;
        const { id: id6, ...rightsFeesManagerAddress } =
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager.headquartersAddress;

        const organizer = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          phone: organizerPhone,
          headquartersAddress: organizerAddress,
        };
        const producer = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer,
          phone: producerPhone,
          headquartersAddress: producerAddress,
        };
        const rightsFeesManager = {
          ...getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager,
          phone: rightsFeesManagerPhone,
          headquartersAddress: rightsFeesManagerAddress,
        };

        reset({
          eventSerieId: eventSerieId,
          clientId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.clientId,
          officialHeadquartersId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.officialHeadquartersId,
          productionOperationId: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.productionOperationId,
          productionType: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.productionType,
          placeName: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeName,
          placePostalCode: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placePostalCode,
          placeCity: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeCity,
          audience: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.audience,
          placeCapacity: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.placeCapacity,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.accountingEntries,
          organizer: organizer,
          producer: producer,
          rightsFeesManager: rightsFeesManager,
          performedWorks: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.performedWorks,
          declarationPlace: getSacdDeclaration.data.sacdDeclarationWrapper.declaration.declarationPlace,
        });

        // Init the UI correctly
        const organizerProducerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer
        );
        const producerRightsFeesManagerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.producer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager
        );
        const organizerRightsFeesManagerDiff = diff(
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.organizer,
          getSacdDeclaration.data.sacdDeclarationWrapper.declaration.rightsFeesManager
        );

        setProducerSameThanOrganizer(organizerProducerDiff.length === 0);
        setRightsFeesManagerSameThan(
          // Here by default we set "organizer" if "producer" is also the same
          organizerRightsFeesManagerDiff.length === 0 ? 'organizer' : producerRightsFeesManagerDiff.length === 0 ? 'producer' : 'none'
        );
      } else if (getSacdDeclaration.data.sacdDeclarationWrapper.placeholder) {
        reset({
          eventSerieId: eventSerieId,
          accountingEntries: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.accountingEntries,
          performedWorks: getSacdDeclaration.data.sacdDeclarationWrapper.placeholder.performedWorks,
        });
      }
    }
  }, [getSacdDeclaration.data, formInitialized, setFormInitialized, reset, eventSerieId]);

  if (aggregatedQueries.isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (aggregatedQueries.hasError) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={aggregatedQueries.errors} refetchs={aggregatedQueries.refetchs} />
      </Grid>
    );
  }

  const eventSerie = getEventSerie.data!.eventSerie;
  const eventsWrappers = listEvents.data!.eventsWrappers; // Descending order (from the API)
  const sacdDeclarationWrapper = getSacdDeclaration.data!.sacdDeclarationWrapper;

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        py: 3,
      }}
    >
      <Container>
        <Grid item xs={12} sx={{ pb: 3 }}>
          <Typography component="h1" variant="h5">
            Déclaration SACD
          </Typography>
          <Typography component="h2" variant="h6" data-sentry-mask>
            {eventSerie.name}
          </Typography>
        </Grid>
      </Container>
      {eventsWrappers.length > 0 ? (
        <>
          <Container
            maxWidth={false}
            disableGutters
            sx={{
              bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
              pt: { xs: 3, md: 3 },
              pb: { xs: 3, md: 3 },
            }}
          >
            <Container>
              <Grid container spacing={1} sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
                <Grid item>
                  <Typography component="div" variant="h6">
                    Liste des représentations
                  </Typography>
                  <Typography component="div" variant="body2">
                    Les valeurs associées aux tickets sont modifiables en double-cliquant dessus
                  </Typography>
                </Grid>
                <Grid item sx={{ ml: 'auto' }}>
                  {expandedAccordions.length === eventsWrappers.length ? (
                    <Button variant="text" onClick={() => collapseAllAccordions()}>
                      Tout replier
                    </Button>
                  ) : (
                    <Button variant="text" onClick={() => expandAllAccordions()}>
                      Tout déplier
                    </Button>
                  )}
                </Grid>
              </Grid>
              <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
                <Grid item xs={12} sx={{ py: 2 }}>
                  {eventsWrappers.map((eventsWrapper) => {
                    return (
                      <Accordion
                        key={eventsWrapper.event.id}
                        expanded={expandedAccordions.includes(eventsWrapper.event.id)}
                        onChange={(_, toExpand) => {
                          if (toExpand) {
                            setExpandedAccordions([...expandedAccordions, eventsWrapper.event.id]);
                          } else {
                            setExpandedAccordions(expandedAccordions.filter((id) => id !== eventsWrapper.event.id));
                          }
                        }}
                        sx={{ boxShadow: 'none' }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            '& > .MuiAccordionSummary-content': {
                              gap: 1,
                              flexWrap: 'wrap',
                            },
                          }}
                        >
                          <Typography sx={{ fontWeight: 600 }} data-sentry-mask>
                            {capitalizeFirstLetter(t('date.longWithTime', { date: eventsWrapper.event.startAt }))}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', marginLeft: 'auto', pr: 2 }}>
                            <Chip
                              label={
                                <>
                                  <i className={fr.cx('fr-icon-pantone-line')} />{' '}
                                  {eventsWrapper.sales.reduce(
                                    (acc, sales) => acc + (sales.eventCategoryTickets.totalOverride ?? sales.eventCategoryTickets.total),
                                    0
                                  )}
                                </>
                              }
                              aria-label="nombre de billets vendus"
                              sx={{
                                bgcolor: 'var(--background-contrast-brown-opera)',
                                height: 'auto',
                                '& > .MuiChip-label': {
                                  whiteSpace: 'pre-wrap !important',
                                  wordBreak: 'break-word !important', // Needed in case of word/sentence bigger than parent width
                                },
                                '& ::before': {
                                  // Needed since we cannot override the `<i>` icon style since it's a ::before
                                  '--icon-size': '1rem !important',
                                },
                              }}
                              data-sentry-mask
                            />
                            <Chip
                              label={`${currencyFormatterWithNoDecimals.format(
                                eventsWrapper.sales.reduce(
                                  (acc, sales) =>
                                    acc +
                                    (sales.eventCategoryTickets.totalOverride ?? sales.eventCategoryTickets.total) *
                                      (sales.eventCategoryTickets.priceOverride ?? sales.ticketCategory.price),
                                  0
                                )
                              )} TTC`}
                              sx={{
                                bgcolor: 'var(--background-contrast-brown-opera)',
                                height: 'auto',
                                '& > .MuiChip-label': {
                                  whiteSpace: 'pre-wrap !important',
                                  wordBreak: 'break-word !important', // Needed in case of word/sentence bigger than parent width
                                },
                              }}
                              data-sentry-mask
                            />
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {eventsWrapper.sales.length > 0 ? (
                            <EventSalesTable
                              wrapper={eventsWrapper}
                              onRowUpdate={async (updatedRow) => {
                                // The logic is more complex here to provide a feature to override multiple events at once
                                const oldSales = eventsWrapper.sales.find((s) => s.ticketCategory.id === updatedRow.ticketCategory.id)!;
                                const isPriceMutated =
                                  updatedRow.eventCategoryTickets.priceOverride !== null &&
                                  updatedRow.eventCategoryTickets.priceOverride !== oldSales.eventCategoryTickets.priceOverride;

                                const mutationsToPerform = [
                                  updateEventCategoryTickets.mutateAsync({
                                    eventCategoryTicketsId: updatedRow.eventCategoryTickets.id,
                                    // If the override equals the original value we remove it for the simplicity of understanding for the user (background colors...)
                                    priceOverride:
                                      updatedRow.eventCategoryTickets.priceOverride !== updatedRow.ticketCategory.price
                                        ? updatedRow.eventCategoryTickets.priceOverride
                                        : null,
                                    totalOverride:
                                      updatedRow.eventCategoryTickets.totalOverride !== updatedRow.eventCategoryTickets.total
                                        ? updatedRow.eventCategoryTickets.totalOverride
                                        : null,
                                  }),
                                ];

                                if (isPriceMutated) {
                                  const otherEventsWrappersWithThisTicketCategory = eventsWrappers.filter((eW) => {
                                    // Exclude the current one
                                    return eW !== eventsWrapper && eW.sales.some((s) => s.ticketCategory.id === updatedRow.ticketCategory.id);
                                  });

                                  if (otherEventsWrappersWithThisTicketCategory.length > 0) {
                                    await new Promise<void>((resolve) => {
                                      showConfirmationDialog({
                                        description: (
                                          <>
                                            Voulez-vous aussi appliquer le tarif{' '}
                                            <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                              {updatedRow.ticketCategory.name}
                                            </Typography>{' '}
                                            de{' '}
                                            <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                              {currencyFormatter.format(
                                                updatedRow.eventCategoryTickets.priceOverride ?? updatedRow.ticketCategory.price
                                              )}
                                            </Typography>{' '}
                                            sur les autres représentations de{' '}
                                            <Typography component="span" sx={{ fontWeight: 'bold' }} data-sentry-mask>
                                              {eventSerie.name}
                                            </Typography>{' '}
                                            ?
                                          </>
                                        ),
                                        onConfirm: async () => {
                                          otherEventsWrappersWithThisTicketCategory.forEach((otherEventsWrapper) => {
                                            const otherWrapperSales = otherEventsWrapper.sales.find(
                                              (s) => s.ticketCategory.id === updatedRow.ticketCategory.id
                                            )!;

                                            mutationsToPerform.push(
                                              updateEventCategoryTickets.mutateAsync({
                                                eventCategoryTicketsId: otherWrapperSales.eventCategoryTickets.id,
                                                // If the override equals the original value we remove it for the simplicity of understanding for the user (background colors...)
                                                priceOverride:
                                                  updatedRow.eventCategoryTickets.priceOverride !== otherWrapperSales.ticketCategory.price
                                                    ? updatedRow.eventCategoryTickets.priceOverride
                                                    : null,
                                                totalOverride:
                                                  otherWrapperSales.eventCategoryTickets.totalOverride !==
                                                  otherWrapperSales.eventCategoryTickets.total
                                                    ? otherWrapperSales.eventCategoryTickets.totalOverride
                                                    : null,
                                              })
                                            );
                                          });

                                          resolve();
                                        },
                                        onCancel: async () => {
                                          resolve();
                                        },
                                      });
                                    });
                                  }
                                }

                                await Promise.all(mutationsToPerform);
                              }}
                            />
                          ) : (
                            <>Aucune catégorie de ticket pour cette représentation n&apos;a été trouvée.</>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                </Grid>
              </Grid>
            </Container>
          </Container>
          <Container sx={{ pt: 2 }}>
            <BaseForm
              handleSubmit={preHandleSubmit}
              onSubmit={onSubmit}
              control={control}
              ariaLabel="renseigner la déclaration"
              style={{ paddingTop: 20 }}
            >
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Informations sur la structure
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      // TODO: should be editable from the account
                      title={'Cet intitulé a été configuré par notre équipe au moment de votre inscription'}
                    >
                      <TextField
                        disabled
                        label="Raison sociale de la structure"
                        value={sacdDeclarationWrapper.declaration?.organizationName ?? sacdDeclarationWrapper.placeholder.organizationName}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="clientId"
                      defaultValue={control._defaultValues.clientId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.clientId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="N° identifiant SACD"
                                inputRef={ref}
                                error={!!error}
                                helperText={error?.message}
                                fullWidth
                              />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="officialHeadquartersId"
                      defaultValue={control._defaultValues.officialHeadquartersId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.officialHeadquartersId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="N° Siret" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Votre spectacle
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="productionOperationId"
                      defaultValue={control._defaultValues.productionOperationId || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.productionOperationId}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Dossier d'exploitation"
                                inputRef={ref}
                                error={!!error}
                                helperText={error?.message}
                                fullWidth
                              />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="productionType"
                      defaultValue={'' as any} // Needed to have a controlled input
                      render={({ field: field, fieldState: { error }, formState }) => {
                        return (
                          <TextField
                            select
                            {...field}
                            label="Nature de l'exploitation"
                            error={!!error}
                            helperText={error?.message}
                            margin="dense"
                            fullWidth
                            sx={{ m: 0 }}
                          >
                            {Object.values(SacdProductionTypeSchema.Values).map((productionType) => (
                              <MenuItem key={productionType} value={productionType}>
                                {t(`model.sacdDeclaration.productionType.enum.${productionType}`)}
                              </MenuItem>
                            ))}
                          </TextField>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Tooltip title={'Cet intitulé est non modifiable car il provient de votre système de billetterie'}>
                      <TextField disabled label="Titre du spectacle" value={eventSerie.name} fullWidth />
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Lieu de représentation
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeName"
                      defaultValue={control._defaultValues.placeName || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.placeName}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => {
                              return <TextField {...params} label="Salle" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />;
                            }}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placePostalCode"
                      defaultValue={control._defaultValues.placePostalCode || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.placePostalCode}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Code postal" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeCity"
                      defaultValue={control._defaultValues.placeCity || ''}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            options={sacdDeclarationWrapper.placeholder.placeCity}
                            freeSolo
                            onBlur={onBlur}
                            value={value}
                            onInputChange={(event, newValue, reason) => {
                              onChange(newValue);
                            }}
                            renderInput={(params) => (
                              <TextField {...params} label="Ville" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Déclaration de la billetterie
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="audience"
                      defaultValue={'' as any} // Needed to have a controlled input
                      render={({ field: field, fieldState: { error }, formState }) => {
                        return (
                          <TextField
                            select
                            {...field}
                            label="Nature des représentations"
                            error={!!error}
                            helperText={error?.message}
                            margin="dense"
                            fullWidth
                            sx={{ m: 0 }}
                          >
                            {Object.values(SacdAudienceSchema.Values).map((audience) => (
                              <MenuItem key={audience} value={audience}>
                                {t(`model.sacdDeclaration.audience.enum.${audience}`)}
                              </MenuItem>
                            ))}
                          </TextField>
                        );
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
                        borderRadius: '8px',
                        py: { xs: 2, md: 3 },
                        px: { xs: 1, md: 2 },
                        mt: 1,
                        mb: 2,
                      }}
                    >
                      <SacdTicketingEntriesTable wrappers={eventsWrappers} audience={watch('audience')} taxRate={eventSerie.taxRate} />
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Tooltip
                      title={
                        'Cette valeur provient initialement de votre billetterie mais peut être corrigée en ajustant les valeurs des représentations plus haut'
                      }
                    >
                      <TextField
                        disabled
                        label="Tarif moyen du billet affiché pour le spectacle"
                        value={currencyFormatter.format(
                          sacdDeclarationWrapper.declaration?.averageTicketPrice ?? sacdDeclarationWrapper.placeholder.averageTicketPrice
                        )}
                        fullWidth
                      />
                    </Tooltip>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      control={control}
                      name="placeCapacity"
                      defaultValue={control._defaultValues.placeCapacity}
                      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                        return (
                          <Autocomplete
                            // [WORKAROUND] We had issue for `value` and some errors on changes when dealing with number
                            // So only using numbers for the underlying `TextField`
                            options={sacdDeclarationWrapper.placeholder.placeCapacity.map((capacity) => {
                              return capacity.toString(); // This is fine since dealing with integers, there is no dot/comma to format
                            })}
                            freeSolo
                            onBlur={onBlur}
                            value={value ? value.toString() : ''}
                            onInputChange={(event, newValue, reason) => {
                              const value = parseInt(newValue, 10);

                              onChange(value);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                type="number"
                                label="Jauge"
                                inputRef={ref}
                                inputProps={{
                                  // [WORKAROUND] We tried using the non-deprecated `slotProps.htmlInput.step` but it throws an error and
                                  //  `...params.slotProps.htmlInput` does not exist, so using the old way until fix
                                  // Old ref: https://github.com/mui/material-ui/issues/28687
                                  ...params.inputProps,
                                  step: 1, // Force the number to be an integer (not a float)
                                }}
                                onWheel={(event) => {
                                  // [WORKAROUND] Ref: https://github.com/mui/material-ui/issues/19154#issuecomment-2566529204

                                  // `event.currentTarget` is a callable type but is targetting the MUI element
                                  // whereas `event.target` targets the input element but does not have the callable type, so casting
                                  (event.target as HTMLInputElement).blur();
                                }}
                                error={!!error}
                                helperText={error?.message}
                                fullWidth
                              />
                            )}
                            renderOption={(props, option) => {
                              // Just needed for the Sentry mask
                              return (
                                <li {...props} key={option} data-sentry-mask>
                                  {option}
                                </li>
                              );
                            }}
                          />
                        );
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sx={{ pb: 2 }}>
                <Typography gutterBottom variant="h6" component="div">
                  Prix de cession du droit d&apos;exploitation du spectacle
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        bgcolor: fr.colors.decisions.background.alt.redMarianne.default,
                        borderRadius: '8px',
                        py: { xs: 2, md: 3 },
                        px: { xs: 1, md: 2 },
                        mt: 1,
                      }}
                    >
                      <SacdAccountingEntriesTable control={control} trigger={trigger} errors={errors.accountingEntries} />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Organisateur ou diffuseur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <SacdOrganizationFields
                    control={control}
                    organizationType="organizer"
                    placeholder={sacdDeclarationWrapper.placeholder.organizer}
                    errors={errors.organizer}
                  />
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Producteur ou tourneur
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl
                      error={
                        (producerSameThanOrganizer === null && !!errors?.producer?.message) ||
                        (producerSameThanOrganizer === true && !!errors?.organizer)
                      }
                    >
                      <FormLabel id="producer-choice-radio-buttons-group-label">
                        Est-ce le même organisme que l&apos;organisateur/diffuseur ?
                      </FormLabel>
                      <RadioGroup
                        row
                        value={producerSameThanOrganizer}
                        onChange={(event) => {
                          const value = event.target.value === 'true';

                          setProducerSameThanOrganizer(value);
                        }}
                        aria-labelledby="producer-choice-radio-buttons-group-label"
                        aria-describedby="producer-choice-helper-text"
                      >
                        <FormControlLabel value="true" control={<Radio />} label="Oui" />
                        <FormControlLabel value="false" control={<Radio />} label="Non" />
                      </RadioGroup>
                      <FormHelperText id="producer-choice-helper-text">
                        {producerSameThanOrganizer === null && errors?.producer?.message}
                        {producerSameThanOrganizer === true && errors?.organizer && `Veuillez corriger les champs pour l'organisateur/diffuseur`}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  {producerSameThanOrganizer === false && (
                    <SacdOrganizationFields
                      control={control}
                      organizationType="producer"
                      placeholder={sacdDeclarationWrapper.placeholder.producer}
                      errors={errors.producer}
                    />
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Organisme responsable du paiement des droits
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl
                      error={
                        (rightsFeesManagerSameThan === null && !!errors?.rightsFeesManager?.message) ||
                        (rightsFeesManagerSameThan === 'organizer' && !!errors?.organizer) ||
                        (rightsFeesManagerSameThan === 'producer' && !!errors?.producer)
                      }
                    >
                      <FormLabel id="rights-fees-manager-choice-radio-buttons-group-label">Quel organisme ?</FormLabel>
                      <RadioGroup
                        row
                        value={rightsFeesManagerSameThan}
                        onChange={(event) => {
                          setRightsFeesManagerSameThan(event.target.value as 'none' | 'organizer' | 'producer');
                        }}
                        aria-labelledby="rights-fees-manager-choice-radio-buttons-group-label"
                        aria-describedby="rights-fees-manager-choice-helper-text"
                      >
                        <FormControlLabel value="organizer" control={<Radio />} label="Organisateur/diffuseur" />
                        <FormControlLabel value="producer" control={<Radio />} label="Producteur/tourneur" />
                        <FormControlLabel value="none" control={<Radio />} label="Un autre" />
                      </RadioGroup>
                      <FormHelperText id="rights-fees-manager-choice-helper-text">
                        {rightsFeesManagerSameThan === null && errors?.rightsFeesManager?.message}
                        {rightsFeesManagerSameThan === 'organizer' &&
                          errors?.organizer &&
                          `Veuillez corriger les champs pour l'organisateur/diffuseur`}
                        {rightsFeesManagerSameThan === 'producer' && errors?.producer && `Veuillez corriger les champs pour le producteur/tourneur`}
                      </FormHelperText>
                    </FormControl>
                  </Grid>
                  {rightsFeesManagerSameThan === 'none' && (
                    <SacdOrganizationFields
                      control={control}
                      organizationType="rightsFeesManager"
                      placeholder={sacdDeclarationWrapper.placeholder.rightsFeesManager}
                      errors={errors.rightsFeesManager}
                    />
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom variant="h6" component="div">
                  Œuvre(s) représentée(s)
                </Typography>
                <hr />
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        bgcolor: fr.colors.decisions.background.alt.yellowMoutarde.default,
                        borderRadius: '8px',
                        py: { xs: 2, md: 3 },
                        px: { xs: 1, md: 2 },
                        mt: 1,
                      }}
                    >
                      <SacdPerformedWorksTable
                        control={control}
                        trigger={trigger}
                        placeholder={sacdDeclarationWrapper.placeholder.performedWorksOptions}
                        errors={errors.performedWorks}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} sm={6} sx={{ mt: 2, pb: 2 }}>
                <Controller
                  control={control}
                  name="declarationPlace"
                  defaultValue={control._defaultValues.declarationPlace || ''}
                  render={({ field: { onChange, onBlur, value, ref }, fieldState: { error }, formState }) => {
                    return (
                      <Autocomplete
                        options={sacdDeclarationWrapper.placeholder.declarationPlace}
                        freeSolo
                        onBlur={onBlur}
                        value={value}
                        onInputChange={(event, newValue, reason) => {
                          onChange(newValue);
                        }}
                        renderInput={(params) => (
                          <TextField {...params} label="Lieu de déclaration" inputRef={ref} error={!!error} helperText={error?.message} fullWidth />
                        )}
                        renderOption={(props, option) => {
                          // Just needed for the Sentry mask
                          return (
                            <li {...props} key={option} data-sentry-mask>
                              {option}
                            </li>
                          );
                        }}
                      />
                    );
                  }}
                />
              </Grid>
              <Grid
                item
                xs={12}
                sx={{
                  // If it has been filled once or the form has been mutated, make the area visible to not miss possible actions
                  position: sacdDeclarationWrapper.declaration || isDirty ? 'sticky' : 'relative',
                  bottom: 0,
                  bgcolor: fr.colors.decisions.background.default.grey.default,
                  zIndex: 450,
                  pt: 2,
                }}
              >
                <Grid container spacing={2} sx={{ alignItems: 'center', pb: 2 }}>
                  {isDirty || !sacdDeclarationWrapper.declaration ? (
                    <Grid item xs>
                      <Button
                        type="submit"
                        loading={fillSacdDeclaration.isLoading}
                        size="large"
                        variant="contained"
                        color="warning"
                        fullWidth
                        startIcon={<SaveIcon />}
                      >
                        Enregistrer les modifications en cours
                      </Button>
                    </Grid>
                  ) : (
                    <>
                      <Grid item xs>
                        <Button
                          component={NextLink}
                          href={linkRegistry.get('declarationPdf', {
                            eventSerieId: eventSerie.id,
                            type: DeclarationTypeSchema.Values.SACD,
                            download: true,
                          })}
                          download // Not forcing the download so using an explicit query parameter to force headers from the server
                          target="_blank" // Needed otherwise after the first click it won't work again (probably due to this page receiving headers already)
                          size="large"
                          variant="contained"
                          fullWidth
                          startIcon={<DownloadIcon />}
                          sx={{
                            '&::after': {
                              display: 'none !important',
                            },
                          }}
                        >
                          Télécharger la déclaration
                        </Button>
                      </Grid>
                      <Grid item xs>
                        <Button
                          component={NextLink}
                          href={linkRegistry.get('declarationPdf', {
                            eventSerieId: eventSerie.id,
                            type: DeclarationTypeSchema.Values.SACD,
                          })}
                          target="_blank"
                          size="large"
                          variant="contained"
                          fullWidth
                          startIcon={<VisibilityIcon />}
                          sx={{
                            '&::after': {
                              display: 'none !important',
                            },
                          }}
                        >
                          Visualiser la déclaration
                        </Button>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="warning">
                  Notre service vous permet de générer la déclaration remplie mais n&apos;effectue pas de télétransmission.{' '}
                  <Typography component="span" sx={{ fontSize: 'inherit', fontWeight: 'bold' }}>
                    Il vous incombe de transmettre le fichier PDF de cette déclaration à votre interlocuteur SACD compétent. Et de vous assurer de
                    l&apos;exactitude des informations saisies.
                  </Typography>
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Si l&apos;interface ne répond pas à toutes les spécificités de votre déclaration, vous pouvez :
                  <ol>
                    <li>Contacter le support pour que nous sachions quoi améliorer ;</li>
                    <li>
                      Reporter manuellement les données sur le PDF fourni par la SACD (
                      <Link
                        component={NextLink}
                        href={`${getBaseUrl()}/assets/templates/declaration/sacd.pdf`}
                        target="_blank"
                        underline="none"
                        sx={{
                          '&::after': {
                            display: 'none !important',
                          },
                        }}
                      >
                        téléchargeable ici
                      </Link>
                      ).
                    </li>
                  </ol>
                </Alert>
              </Grid>
            </BaseForm>
          </Container>
        </>
      ) : (
        <Container
          sx={{
            py: 3,
          }}
        >
          <Grid container spacing={2} justifyContent="center" sx={{ pt: 3 }}>
            <Grid item xs={12} sx={{ py: 2 }}>
              Aucune date n&apos;a pu être récupérée pour cette série de représentations. Il n&apos;y a donc aucune déclaration à faire à la SACD.
            </Grid>
          </Grid>
        </Container>
      )}
    </Container>
  );
}
