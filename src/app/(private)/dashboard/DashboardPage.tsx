'use client';

import Button from '@mui/lab/LoadingButton';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import { redirect } from 'next/navigation';

import { trpc } from '@ad/src/client/trpcClient';
import { ErrorAlert } from '@ad/src/components/ErrorAlert';
import { LoadingArea } from '@ad/src/components/LoadingArea';
import { useLiveChat } from '@ad/src/components/live-chat/useLiveChat';
import { centeredAlertContainerGridProps } from '@ad/src/utils/grid';
import { linkRegistry } from '@ad/src/utils/routes/registry';

export interface DashboardPageProps {}

export function DashboardPage(props: DashboardPageProps) {
  const { showLiveChat, isLiveChatLoading } = useLiveChat();

  const { data, error, isLoading, refetch } = trpc.getInterfaceSession.useQuery({});

  if (isLoading) {
    return <LoadingArea ariaLabelTarget="contenu" />;
  } else if (error) {
    return (
      <Grid container {...centeredAlertContainerGridProps}>
        <ErrorAlert errors={[error]} refetchs={[refetch]} />
      </Grid>
    );
  }

  const userInterfaceSession = data.session;

  // Since we have a manual onboarding for now we can consider all users having at last 1 organization
  if (userInterfaceSession.collaboratorOf.length) {
    const organization = userInterfaceSession.collaboratorOf[0];

    redirect(
      linkRegistry.get('organization', {
        organizationId: organization.id,
      })
    );

    return;
  } else {
    // Simple user cannot see much
    return (
      <Container
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <Grid container sx={{ justifyContent: 'center' }}>
          <Typography component="h1" variant="h4" sx={{ textAlign: 'center', py: 2 }}>
            Bienvenue sur la plateforme !
          </Typography>
          <Typography component="p" variant="body2" sx={{ textAlign: 'center', py: 2 }}>
            Vous n&apos;avez actuellement aucun accès spécifique à la plateforme. Veuillez nous contacter par la messagerie.
          </Typography>
          <Button onClick={showLiveChat} loading={isLiveChatLoading} size="large" variant="contained">
            Ouvrir la messagerie
          </Button>
        </Grid>
      </Container>
    );
  }
}
