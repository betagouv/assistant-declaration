import { createRouter, defineRoute, param } from 'type-route';

// `ts-import` paths as `compilerOptions` are not working, we modified the import below to use a relative one
// import { Lang, defineLocalizedRoute } from '@ad/src/utils/routes/common';
import { Lang, defineLocalizedRoute } from './common';

export const localizedRoutes = {
  accessibility: defineLocalizedRoute(
    {},
    {
      en: (p) => `/accessibility`,
      fr: (p) => `/accessibilite`,
    }
  ),
  home: defineLocalizedRoute(
    {},
    {
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
  privacyPolicy: defineLocalizedRoute(
    {},
    {
      en: (p) => `/privacy-policy`,
      fr: (p) => `/politique-de-confidentialite`,
    }
  ),
  termsOfUse: defineLocalizedRoute(
    {},
    {
      en: (p) => `/terms-of-use`,
      fr: (p) => `/conditions-generales-d-utilisation`,
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
    accessibility: defineRoute(localizedRoutes.accessibility.params, localizedRoutes.accessibility.paths.en),
    home: defineRoute(localizedRoutes.home.params, localizedRoutes.home.paths.en),
    legalNotice: defineRoute(localizedRoutes.legalNotice.params, localizedRoutes.legalNotice.paths.en),
    organization: defineRoute(localizedRoutes.organization.params, localizedRoutes.organization.paths.en),
    privacyPolicy: defineRoute(localizedRoutes.privacyPolicy.params, localizedRoutes.privacyPolicy.paths.en),
    termsOfUse: defineRoute(localizedRoutes.termsOfUse.params, localizedRoutes.termsOfUse.paths.en),
  }).routes,
  fr: createLocalizedRouter({
    accessibility: defineRoute(localizedRoutes.accessibility.params, localizedRoutes.accessibility.paths.fr),
    home: defineRoute(localizedRoutes.home.params, localizedRoutes.home.paths.fr),
    legalNotice: defineRoute(localizedRoutes.legalNotice.params, localizedRoutes.legalNotice.paths.fr),
    organization: defineRoute(localizedRoutes.organization.params, localizedRoutes.organization.paths.fr),
    privacyPolicy: defineRoute(localizedRoutes.privacyPolicy.params, localizedRoutes.privacyPolicy.paths.fr),
    termsOfUse: defineRoute(localizedRoutes.termsOfUse.params, localizedRoutes.termsOfUse.paths.fr),
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
