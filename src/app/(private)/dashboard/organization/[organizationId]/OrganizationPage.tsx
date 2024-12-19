'use client';

import { LoadingButton as Button } from '@mui/lab';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';

export interface OrganizationPageProps {
  params: { organizationId: string };
}

export function OrganizationPage({ params: { organizationId } }: OrganizationPageProps) {
  const { data, error, isLoading, refetch } = trpc.getOrganization.useQuery({
    id: organizationId,
  });

  const synchronizeDataFromTicketingSystems = trpc.synchronizeDataFromTicketingSystems.useMutation();

  if (isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} refetchs={[refetch]} />
      </Grid>
    );
  }

  const organization = data.organization;

  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        py: 3,
      }}
    >
      <Grid container spacing={2} justifyContent="center">
        {synchronizeDataFromTicketingSystems.error && (
          <Grid item xs={12} sx={{ py: 2 }}>
            <ErrorAlert errors={[synchronizeDataFromTicketingSystems.error]} />
          </Grid>
        )}
        <Grid item xs={12} sx={{ py: 2 }}>
          <Button
            onClick={async () => {
              await synchronizeDataFromTicketingSystems.mutateAsync({
                organizationId: organization.id,
              });
            }}
            loading={synchronizeDataFromTicketingSystems.isLoading}
            size="large"
            variant="contained"
          >
            Synchroniser les données
          </Button>
        </Grid>
      </Grid>
    </Container>
  );
}
