import { createRouter, defineRoute, param } from 'type-route';

// For whatever reason when using TypeScript version of `next.config.ts`
// it has to be a relative path otherwise it says `MODULE_NOT_FOUND`...
import { Lang, defineLocalizedRoute } from './common';

export const localizedRoutes = {
  about: defineLocalizedRoute(
    {},
    {
      en: (p) => `/about`,
      fr: (p) => `/a-propros`,
    }
  ),
  accessibility: defineLocalizedRoute(
    {},
    {
      en: (p) => `/accessibility`,
      fr: (p) => `/accessibilite`,
    }
  ),
  accountSettings: defineLocalizedRoute(
    {},
    {
      en: (p) => `/account/settings`,
      fr: (p) => `/compte/parametres`,
    }
  ),
  dashboard: defineLocalizedRoute(
    {},
    {
      en: (p) => `/dashboard`,
      fr: (p) => `/tableau-de-bord`,
    }
  ),
  declaration: defineLocalizedRoute(
    { organizationId: param.path.string, eventSerieId: param.path.string, declarationType: param.path.string },
    {
      en: (p) => `/dashboard/organization/${p.organizationId}/serie/${p.eventSerieId}/declaration/${p.declarationType}`,
      fr: (p) => `/tableau-de-bord/organisation/${p.organizationId}/serie/${p.eventSerieId}/declaration/${p.declarationType}`,
    }
  ),
  declarationPdf: defineLocalizedRoute(
    { eventSerieId: param.path.string, type: param.query.string, download: param.query.optional.boolean },
    {
      en: (p) => `/api/declaration/${p.eventSerieId}`,
      fr: (p) => `/api/declaration/${p.eventSerieId}`,
    }
  ),
  docsBilletwebConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/billetweb-connection`,
      fr: (p) => `/documentation/connexion-billetweb`,
    }
  ),
  docsHelloassoConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/helloasso-connection`,
      fr: (p) => `/documentation/connexion-helloasso`,
    }
  ),
  docsMapadoConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/mapado-connection`,
      fr: (p) => `/documentation/connexion-mapado`,
    }
  ),
  docsShotgunConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/shotgun-connection`,
      fr: (p) => `/documentation/connexion-shotgun`,
    }
  ),
  docsSoticketConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/soticket-connection`,
      fr: (p) => `/documentation/connexion-soticket`,
    }
  ),
  docsSupersoniksConnection: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/supersoniks-connection`,
      fr: (p) => `/documentation/connexion-supersoniks`,
    }
  ),
  docsTicketingApiDefinition: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/ticketing-api-definition`,
      fr: (p) => `/documentation/specifications-api-de-billetterie`,
    }
  ),
  docsTicketingApiUsage: defineLocalizedRoute(
    {},
    {
      en: (p) => `/docs/ticketing-api-usage`,
      fr: (p) => `/documentation/utilisation-api-de-billetterie`,
    }
  ),
  forgottenPassword: defineLocalizedRoute(
    {},
    {
      en: (p) => `/auth/password/retrieve`,
      fr: (p) => `/authentification/mot-de-passe/recuperer`,
    }
  ),
  frequentlyAskedQuestions: defineLocalizedRoute(
    {},
    {
      en: (p) => `/frequently-asked-questions`,
      fr: (p) => `/questions-frequentes`,
    }
  ),
  home: defineLocalizedRoute(
    {},
    {
      // We chose to make it direct to either the sign in page or the dashboard, it's managed at the Next.js layer
      en: (p) => `/`,
      fr: (p) => `/`,
    }
  ),
  legalNotice: defineLocalizedRoute(
    {},
    {
      en: (p) => `/legal-notice`,
      fr: (p) => `/mentions-legales`,
    }
  ),
  organization: defineLocalizedRoute(
    { organizationId: param.path.string },
    {
      en: (p) => `/dashboard/organization/${p.organizationId}`,
      fr: (p) => `/tableau-de-bord/organisation/${p.organizationId}`,
    }
  ),
  organizationCreation: defineLocalizedRoute(
    {},
    {
      en: (p) => `/dashboard/organization/create`,
      fr: (p) => `/tableau-de-bord/collectivite/creer`,
    }
  ),
  privacyPolicy: defineLocalizedRoute(
    {},
    {
      en: (p) => `/privacy-policy`,
      fr: (p) => `/politique-de-confidentialite`,
    }
  ),
  resetPassword: defineLocalizedRoute(
    {
      token: param.query.string,
    },
    {
      en: (p) => `/auth/password/reset`,
      fr: (p) => `/authentification/mot-de-passe/reinitialiser`,
    }
  ),
  signIn: defineLocalizedRoute(
    {
      session_end: param.query.optional.boolean,
      token: param.query.optional.string,
    },
    {
      en: (p) => `/auth/sign-in`,
      fr: (p) => `/authentification/connexion`,
    }
  ),
  signUp: defineLocalizedRoute(
    {
      token: param.query.optional.string,
    },
    {
      en: (p) => `/auth/sign-up`,
      fr: (p) => `/authentification/inscription`,
    }
  ),
  termsOfUse: defineLocalizedRoute(
    {},
    {
      en: (p) => `/terms-of-use`,
      fr: (p) => `/modalites-d-utilisation`,
    }
  ),
  ticketingSystemConnection: defineLocalizedRoute(
    { organizationId: param.path.string, onboarding: param.query.optional.boolean },
    {
      en: (p) => `/dashboard/organization/${p.organizationId}/ticketing-system/connect`,
      fr: (p) => `/tableau-de-bord/organisation/${p.organizationId}/systeme-de-billetterie/connexion`,
    }
  ),
  ticketingSystemEdit: defineLocalizedRoute(
    { organizationId: param.path.string, ticketingSystemId: param.path.string },
    {
      en: (p) => `/dashboard/organization/${p.organizationId}/ticketing-system/${p.ticketingSystemId}/edit`,
      fr: (p) => `/tableau-de-bord/organisation/${p.organizationId}/systeme-de-billetterie/${p.ticketingSystemId}/editer`,
    }
  ),
  ticketingSystemList: defineLocalizedRoute(
    { organizationId: param.path.string },
    {
      en: (p) => `/dashboard/organization/${p.organizationId}/ticketing-systems`,
      fr: (p) => `/tableau-de-bord/organisation/${p.organizationId}/systemes-de-billetterie`,
    }
  ),
};

// function createLocalizedRouter(lang: Lang, localeRoutes: typeof localizedRoutes) {
//   const dummy: any = {};

//   const pseudoRoutes = localeRoutes as any;
//   for (const routeName in localeRoutes) {
//     console.log(routeName);
//     console.log(pseudoRoutes[routeName]);

//     dummy[routeName] = defineRoute(pseudoRoutes[routeName].params, pseudoRoutes[routeName].paths[lang]);
//   }

//   return createRouter(dummy).routes;
// }

// export const routes = {
//   en: createLocalizedRouter('en', localizedRoutes),
//   fr: createLocalizedRouter('fr', localizedRoutes),
// };

//
//
// [TO READ]
// I'm really sorry... I was looking to get a registry of links to be type-safe but I was not able to
// implement `createLocalizedRouter` so it keeps types in the return. I have no idea how to deal with that... so doing building the object manually for now
//
//

function createLocalizedRouter<RouteDefs extends { [routeName in keyof typeof localizedRoutes]: any }>(routeDefs: RouteDefs) {
  return createRouter(routeDefs);
}

export const routes = {
  en: createLocalizedRouter({
    about: defineRoute(localizedRoutes.about.params, localizedRoutes.about.paths.en),
    accessibility: defineRoute(localizedRoutes.accessibility.params, localizedRoutes.accessibility.paths.en),
    accountSettings: defineRoute(localizedRoutes.accountSettings.params, localizedRoutes.accountSettings.paths.en),
    dashboard: defineRoute(localizedRoutes.dashboard.params, localizedRoutes.dashboard.paths.en),
    declaration: defineRoute(localizedRoutes.declaration.params, localizedRoutes.declaration.paths.en),
    declarationPdf: defineRoute(localizedRoutes.declarationPdf.params, localizedRoutes.declarationPdf.paths.en),
    docsBilletwebConnection: defineRoute(localizedRoutes.docsBilletwebConnection.params, localizedRoutes.docsBilletwebConnection.paths.en),
    docsHelloassoConnection: defineRoute(localizedRoutes.docsHelloassoConnection.params, localizedRoutes.docsHelloassoConnection.paths.en),
    docsMapadoConnection: defineRoute(localizedRoutes.docsMapadoConnection.params, localizedRoutes.docsMapadoConnection.paths.en),
    docsShotgunConnection: defineRoute(localizedRoutes.docsShotgunConnection.params, localizedRoutes.docsShotgunConnection.paths.en),
    docsSoticketConnection: defineRoute(localizedRoutes.docsSoticketConnection.params, localizedRoutes.docsSoticketConnection.paths.en),
    docsSupersoniksConnection: defineRoute(localizedRoutes.docsSupersoniksConnection.params, localizedRoutes.docsSupersoniksConnection.paths.en),
    docsTicketingApiDefinition: defineRoute(localizedRoutes.docsTicketingApiDefinition.params, localizedRoutes.docsTicketingApiDefinition.paths.en),
    docsTicketingApiUsage: defineRoute(localizedRoutes.docsTicketingApiUsage.params, localizedRoutes.docsTicketingApiUsage.paths.en),
    forgottenPassword: defineRoute(localizedRoutes.forgottenPassword.params, localizedRoutes.forgottenPassword.paths.en),
    frequentlyAskedQuestions: defineRoute(localizedRoutes.frequentlyAskedQuestions.params, localizedRoutes.frequentlyAskedQuestions.paths.en),
    home: defineRoute(localizedRoutes.home.params, localizedRoutes.home.paths.en),
    legalNotice: defineRoute(localizedRoutes.legalNotice.params, localizedRoutes.legalNotice.paths.en),
    organization: defineRoute(localizedRoutes.organization.params, localizedRoutes.organization.paths.en),
    organizationCreation: defineRoute(localizedRoutes.organizationCreation.params, localizedRoutes.organizationCreation.paths.en),
    privacyPolicy: defineRoute(localizedRoutes.privacyPolicy.params, localizedRoutes.privacyPolicy.paths.en),
    resetPassword: defineRoute(localizedRoutes.resetPassword.params, localizedRoutes.resetPassword.paths.en),
    signIn: defineRoute(localizedRoutes.signIn.params, localizedRoutes.signIn.paths.en),
    signUp: defineRoute(localizedRoutes.signUp.params, localizedRoutes.signUp.paths.en),
    termsOfUse: defineRoute(localizedRoutes.termsOfUse.params, localizedRoutes.termsOfUse.paths.en),
    ticketingSystemConnection: defineRoute(localizedRoutes.ticketingSystemConnection.params, localizedRoutes.ticketingSystemConnection.paths.en),
    ticketingSystemEdit: defineRoute(localizedRoutes.ticketingSystemEdit.params, localizedRoutes.ticketingSystemEdit.paths.en),
    ticketingSystemList: defineRoute(localizedRoutes.ticketingSystemList.params, localizedRoutes.ticketingSystemList.paths.en),
  }).routes,
  fr: createLocalizedRouter({
    about: defineRoute(localizedRoutes.about.params, localizedRoutes.about.paths.fr),
    accessibility: defineRoute(localizedRoutes.accessibility.params, localizedRoutes.accessibility.paths.fr),
    accountSettings: defineRoute(localizedRoutes.accountSettings.params, localizedRoutes.accountSettings.paths.fr),
    dashboard: defineRoute(localizedRoutes.dashboard.params, localizedRoutes.dashboard.paths.fr),
    declaration: defineRoute(localizedRoutes.declaration.params, localizedRoutes.declaration.paths.fr),
    declarationPdf: defineRoute(localizedRoutes.declarationPdf.params, localizedRoutes.declarationPdf.paths.fr),
    docsBilletwebConnection: defineRoute(localizedRoutes.docsBilletwebConnection.params, localizedRoutes.docsBilletwebConnection.paths.fr),
    docsHelloassoConnection: defineRoute(localizedRoutes.docsHelloassoConnection.params, localizedRoutes.docsHelloassoConnection.paths.fr),
    docsMapadoConnection: defineRoute(localizedRoutes.docsMapadoConnection.params, localizedRoutes.docsMapadoConnection.paths.fr),
    docsShotgunConnection: defineRoute(localizedRoutes.docsShotgunConnection.params, localizedRoutes.docsShotgunConnection.paths.fr),
    docsSoticketConnection: defineRoute(localizedRoutes.docsSoticketConnection.params, localizedRoutes.docsSoticketConnection.paths.fr),
    docsSupersoniksConnection: defineRoute(localizedRoutes.docsSupersoniksConnection.params, localizedRoutes.docsSupersoniksConnection.paths.fr),
    docsTicketingApiDefinition: defineRoute(localizedRoutes.docsTicketingApiDefinition.params, localizedRoutes.docsTicketingApiDefinition.paths.fr),
    docsTicketingApiUsage: defineRoute(localizedRoutes.docsTicketingApiUsage.params, localizedRoutes.docsTicketingApiUsage.paths.fr),
    forgottenPassword: defineRoute(localizedRoutes.forgottenPassword.params, localizedRoutes.forgottenPassword.paths.fr),
    frequentlyAskedQuestions: defineRoute(localizedRoutes.frequentlyAskedQuestions.params, localizedRoutes.frequentlyAskedQuestions.paths.fr),
    home: defineRoute(localizedRoutes.home.params, localizedRoutes.home.paths.fr),
    legalNotice: defineRoute(localizedRoutes.legalNotice.params, localizedRoutes.legalNotice.paths.fr),
    organization: defineRoute(localizedRoutes.organization.params, localizedRoutes.organization.paths.fr),
    organizationCreation: defineRoute(localizedRoutes.organizationCreation.params, localizedRoutes.organizationCreation.paths.fr),
    privacyPolicy: defineRoute(localizedRoutes.privacyPolicy.params, localizedRoutes.privacyPolicy.paths.fr),
    resetPassword: defineRoute(localizedRoutes.resetPassword.params, localizedRoutes.resetPassword.paths.fr),
    signIn: defineRoute(localizedRoutes.signIn.params, localizedRoutes.signIn.paths.fr),
    signUp: defineRoute(localizedRoutes.signUp.params, localizedRoutes.signUp.paths.fr),
    termsOfUse: defineRoute(localizedRoutes.termsOfUse.params, localizedRoutes.termsOfUse.paths.fr),
    ticketingSystemConnection: defineRoute(localizedRoutes.ticketingSystemConnection.params, localizedRoutes.ticketingSystemConnection.paths.fr),
    ticketingSystemEdit: defineRoute(localizedRoutes.ticketingSystemEdit.params, localizedRoutes.ticketingSystemEdit.paths.fr),
    ticketingSystemList: defineRoute(localizedRoutes.ticketingSystemList.params, localizedRoutes.ticketingSystemList.paths.fr),
  }).routes,
};

export interface Rewrite {
  source: string;
  destination: string;
}

export function generateRewrites(technicalLang: Lang, routes: { [key in keyof typeof localizedRoutes]: (typeof localizedRoutes)[key] }): Rewrite[] {
  // TODO: find a way to type correctly the routes... :s

  const rewrites: Rewrite[] = [];

  for (const route of Object.values(routes)) {
    for (const pathLang of Object.keys(route.paths)) {
      const typedPathLang = pathLang as Lang;

      if (pathLang === technicalLang) {
        // The technical path does not need a rewrite over itself
        continue;
      }

      const nextjsParameters: any = {};

      for (const [parameterName, parameterValue] of Object.entries(route.params)) {
        // Maybe there is a need to change the format depending on `parameterValue` (in most case it should be a `param.path.string` from the library `type-safe`)
        nextjsParameters[parameterName] = `:${parameterName}`;
      }

      const source = route.paths[typedPathLang](nextjsParameters) as string;
      const destination = route.paths[technicalLang](nextjsParameters) as string;

      if (source === destination) {
        // If they are the same, no need to add a rewrite rule :)
        continue;
      }

      rewrites.push({
        source: source,
        destination: destination,
      });
    }
  }

  return rewrites;
}
