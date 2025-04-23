import { z } from 'zod';

import { emptyStringtoNullPreprocessor, safeCoerceToBoolean, transformStringOrNull } from '@ad/src/utils/validation';
import { applyTypedParsers } from '@ad/src/utils/zod';

//
// [WARNING]
// We commented out the majority of properties because the remote API is returning sometimes unexpected values
// and it's really hard to handle all cases since there is not a clear documentation to anticipate them.
//
// This is the best way to make the production not breaking for unused fields during validation.
//

export const JsonBilletSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      id_commande: z.number().int().nonnegative(),
      date: z.coerce.date(),
      date_commande: z.coerce.date(),
      etat: z.enum(['B', 'A', 'N', 'O', 'C', 'Rx', 'L']),
      devise: z.literal('EUR'),
      montant: z.number().int().nonnegative(), // Cents
      montant_base: z.number().int().nonnegative(), // Cents
      commission: z.number().int().nonnegative(), // Cents
      id_commission: z.string().transform(transformStringOrNull),
      id_categorie: z.string().min(1),
      id_tarif: z.string().min(1),
      id_sous_tarif: z.string().transform(transformStringOrNull),
      id_filiere: z.string().min(1),
      id_formulaire: z.string().min(1),
      // web: z.boolean(),
      // cir: z.unknown(),
      // fam: z.string().transform(transformStringOrNull),
      nbPlaces: z.number().int().nonnegative(),
      // client: z.object({
      //   id: z.number().int().nonnegative(),
      //   nom: z.string().min(1),
      //   prenom: z.string().min(1),
      //   adresse1: z.string().transform(transformStringOrNull),
      //   adresse2: z.string().transform(transformStringOrNull),
      //   adresse3: z.string().transform(transformStringOrNull),
      //   code_postal: z.string().min(1),
      //   ville: z.string().min(1),
      //   pays: z.string().min(1),
      //   titre: z.string().min(1),
      //   anni: z.string().transform(transformStringOrNull),
      //   email: z.string().email(),
      //   envqlt: z.unknown().nullable(),
      // }),
    })
    .strip()
);
export type JsonBilletSchemaType = z.infer<typeof JsonBilletSchema>;

export const JsonSeanceSchema = applyTypedParsers(
  z
    .object({
      id: z.number().int().nonnegative(),
      spec: z.number().int().nonnegative(),
      aff: z.boolean(),
      cache: z.boolean(),
      titre: z.string().min(1), // HTML content
      // comm: z.string().transform(transformStringOrNull),
      // jour: z.enum(['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']),
      date: z.number().int().nonnegative(),
      // salle: z.number().int().nonnegative(),
      // num: z.boolean(),
      // ovl: z.literal(0).or(z.literal(-1)),
      // classSC: z.string().transform(transformStringOrNull),
      // nonDispo: z.number().int().nonnegative(),
      // infoSC: z.number().int().nonnegative(),
      // infoTarifs: z.number().int().nonnegative(),
      // ong: z.number().int().nonnegative(),
      // ctrl: z.number().int().nonnegative(),
      // typeOk: z.number().int().nonnegative(),
      // nbDS: z.number().int().nonnegative(),
      // infoDS: z.number().int().nonnegative(),
      // plan: z.boolean(),
    })
    .strip()
);
export type JsonSeanceSchemaType = z.infer<typeof JsonSeanceSchema>;

export const JsonSpectacleSchema = applyTypedParsers(
  z
    .object({
      // deplie: z.number().int().nonnegative(),
      // img: z.string().min(1),
      // classSP: z.string().transform(transformStringOrNull),
      // adv: z.number().int().nonnegative(),
      titre: z.string().min(1), // HTML content
      infoSP: z.number().int().nonnegative(),
      // filtre: z.string().min(1),
      id: z.number().int().nonnegative(),
      listeSC: z.array(z.number().int().nonnegative()),
    })
    .strip()
);
export type JsonSpectacleSchemaType = z.infer<typeof JsonSpectacleSchema>;

export const JsonSalleSchema = applyTypedParsers(
  z
    .object({
      id: z.string().min(1),
      nom: z.string().min(1),
      adresse: z.string().transform(transformStringOrNull),
      position: z.string().transform(transformStringOrNull),
      zonage: z.object({
        image: z.string().min(1),
        zones: z.record(
          z.string().min(1),
          z.object({
            nom: z.string().min(1),
            coords: z.string().min(1),
          })
        ),
      }),
    })
    .strip()
);
export type JsonSalleSchemaType = z.infer<typeof JsonSalleSchema>;

export const JsonResponseBaseSchema = applyTypedParsers(
  z.object({
    statut: z.literal(true),
    nuerr: z.literal(0),
    erreur: z.string().transform(transformStringOrNull), // Sometimes filled even when no error
  })
);
export type JsonResponseBaseSchemaType = z.infer<typeof JsonResponseBaseSchema>;

export const JsonGetContextResponseSchema = JsonResponseBaseSchema.extend({
  instPA: z.string().min(1),
  inst: z.coerce.number().int().nonnegative(),
  version: z.string().min(1),
  // langues: z.string().min(1),
  // parcours: z.boolean(),
  // regle: z.string().transform(transformStringOrNull),
  // site: z.string().transform(transformStringOrNull),
  // bix: z.string().transform(transformStringOrNull),
  // pNom: z.string().transform(transformStringOrNull),
  // topFSN: z.coerce.date(),
}).strip();
export type JsonGetContextResponseSchemaType = z.infer<typeof JsonGetContextResponseSchema>;

export const JsonListReservationsResponseSchema = JsonResponseBaseSchema.extend({
  histo: z.object({
    seances: z.array(
      z.object({
        id: z.number().int().nonnegative(),
        id_salle: z.string().min(1),
        taux_tva: z.number().nonnegative(), // 2.1 for 2.1%
        billets: z.array(JsonBilletSchema),
      })
    ),
    // trace: z.string().transform(transformStringOrNull),
    // topMin: z.string().min(1),
  }),
}).strip();
export type JsonListReservationsResponseSchemaType = z.infer<typeof JsonListReservationsResponseSchema>;

export const JsonListEventsParametersResponseSchema = JsonResponseBaseSchema.extend({
  data: z.object({
    // dirImage: z.string().url(),
    // catsOVL: z.string().transform(transformStringOrNull),
    messages: z.array(z.string().min(1)),
    spectacles: z.record(z.coerce.number().int().nonnegative(), JsonSpectacleSchema),
    seances: z.record(z.coerce.number().int().nonnegative(), JsonSeanceSchema),
    ordreSC: z.array(z.number().int().nonnegative()),
    // salles: z.record(z.string().min(1), JsonSalleSchema),
    saison: z.number().int().nonnegative(),
    // filtre: z.array(z.string().min(1)),
    // poc: z.unknown(),
  }),
}).strip();
export type JsonListEventsParametersResponseSchemaType = z.infer<typeof JsonListEventsParametersResponseSchema>;

export const JsonListPricesResponseSchema = JsonResponseBaseSchema.extend({
  data: z.object({
    // apiLTinfos: z.unknown().nullable(),
    // apiLTlst: z.string().min(1), // List of events
    // apiLTmin: z.number().int().nonnegative(), // Minimal ID of event
    // apiLTmax: z.number().int().nonnegative(), // Maximal ID of event
    // apiLTctrl: z.unknown().nullable(),
    apiLTcat: z.record(
      z.string().min(1),
      z.object({
        nomCT: z.string().min(1),
        // coulCT: z.string().min(1),
      })
    ),
    version: z.string().min(1),
    grilles: z.array(
      z.array(
        z.object({
          ta: z.string().min(1),
          nm: z.number().int().nonnegative(),
          aff: z.boolean(),
          // nbMax: z.number().int().nonnegative(),
          // css: z.string().transform(transformStringOrNull),
          px: z.record(z.string().min(1), z.number().int().nonnegative()), // Cents
          // ju: z.string().transform(transformStringOrNull),
          // com: z.string().transform(transformStringOrNull),
          // bul: z.string().transform(transformStringOrNull),
        })
      )
    ),
    grilleSeance: z.record(z.coerce.number().int().nonnegative(), z.number().int().nonnegative()),
    messages: z.array(z.string().min(1)),
    // tarifs: z.record(
    //   z.string().min(1),
    //   z.object({
    //     controle: z.string().min(1),
    //     groupe: z.boolean(),
    //   })
    // ),
    // controles: z.record(
    //   z.string().min(1),
    //   z.object({
    //     codeTA: z.array(z.string().min(1)),
    //     generique: z.boolean(),
    //     okAchat: z.boolean(),
    //     nominatif: z.boolean(),
    //     nbMaxCtrl: z.number().int().nonnegative(),
    //     nature: z.enum(['R']),
    //     texte: z.string().min(1),
    //     placeHolder: z.string().min(1),
    //     infoNP: z.string().transform(transformStringOrNull),
    //     okAchatMessage: z.string().min(1),
    //   })
    // ),
    // justifs: z.record(z.string().min(1),z.object({
    //   fam: z.string().min(1),
    //   nomPres: z.string().min(1), // HTML content
    // })),
    // prestations: z.record(z.string().min(1),z.object({
    //   fam: z.string().min(1),
    //   nomPres: z.string().min(1),
    //   prix: z.number().int(), // Can be -1 too
    //   fifo: z.string().transform(transformStringOrNull),
    // })),
    // promos: z.array(z.unknown()),
    // okTA: z.string().transform(transformStringOrNull),
  }),
}).strip();
export type JsonListPricesResponseSchemaType = z.infer<typeof JsonListPricesResponseSchema>;
