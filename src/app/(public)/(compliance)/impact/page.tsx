import jwt from 'jsonwebtoken';
import { Metadata } from 'next';

import { ImpactPage } from '@ad/src/app/(public)/(compliance)/impact/ImpactPage';
import { StartDsfrOnHydration } from '@ad/src/dsfr-bootstrap';
import { formatPageTitle } from '@ad/src/utils/page';

export const metadata: Metadata = {
  title: formatPageTitle(`Mesures d'impact`),
};

export default async function Page() {
  let metabaseIframeUrl: string | null = null;

  if (process.env.METABASE_SITE_URL && process.env.METABASE_SECRET_KEY && process.env.METABASE_IMPACT_DASHBOARD_ID) {
    const payload = {
      resource: { dashboard: process.env.METABASE_IMPACT_DASHBOARD_ID ? parseInt(process.env.METABASE_IMPACT_DASHBOARD_ID, 10) : '-1' },
      params: {},
      exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minutes expiration
    };

    const token = jwt.sign(payload, process.env.METABASE_SECRET_KEY);

    const iframeUrl = new URL(process.env.METABASE_SITE_URL);
    iframeUrl.pathname = `/embed/dashboard/${token}`;

    metabaseIframeUrl = iframeUrl.toString();
  }

  return (
    <>
      <StartDsfrOnHydration />
      <ImpactPage metabaseIframeUrl={metabaseIframeUrl} />;
    </>
  );
}
