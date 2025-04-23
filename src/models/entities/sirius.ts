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

export const JsonCollectionSchema = applyTypedParsers(
  z.object({
    statut: z.literal(true),
    nuerr: z.literal(0),
    erreur: z.string().transform(transformStringOrNull), // Sometimes filled even when no error
  })
);
export type JsonCollectionSchemaType = z.infer<typeof JsonCollectionSchema>;

export const JsonListReservationsResponseSchema = JsonCollectionSchema.extend({
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

export const JsonListEventsParametersResponseSchema = JsonCollectionSchema.extend({
  data: z.object({
    // dirImage: z.string().url(),
    // catsOVL: z.string().transform(transformStringOrNull),
    messages: z.array(z.string().min(1)),
    spectacles: z.record(
      z.coerce.number().int().nonnegative(),
      z.object({
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
    ),
    seances: z.record(
      z.coerce.number().int().nonnegative(),
      z.object({
        id: z.coerce.number().int().nonnegative(),
        spec: z.coerce.number().int().nonnegative(),
        aff: z.boolean(),
        cache: z.boolean(),
        titre: 'Le<br>Malade Imaginaire',
        comm: z.string().transform(transformStringOrNull),
        jour: 'Ve',
        date: 1676660400,
        salle: z.coerce.number().int().nonnegative(),
        num: z.boolean(),
        ovl: z.literal(0).or(z.literal(-1)),
        classSC: z.string().transform(transformStringOrNull),
        nonDispo: 2,
        infoSC: 0,
        infoTarifs: 1,
        ong: 0,
        ctrl: 0,
        typeOk: 0,
        nbDS: 0,
        infoDS: 0,
        plan: z.boolean(),
      })
    ),
    ordreSC: z.array(z.number().int().nonnegative()),
    // salles: z.record(
    //   z.string().min(1),
    //   z.object({
    //     id: z.string().min(1),
    //     nom: z.string().min(1),
    //     adresse: z.string().transform(transformStringOrNull),
    //     position: z.string().transform(transformStringOrNull),
    //     zonage: z.object({
    //       image: z.string().min(1),
    //       zones: z.record(
    //         z.string().min(1),
    //         z.object({
    //           nom: z.string().min(1),
    //           coords: z.string().min(1),
    //         })
    //       ),
    //     }),
    //   })
    // ),
    saison: z.number().int().nonnegative(),
    // filtre: z.array(z.string().min(1)),
    // poc: z.unknown(),
  }),
}).strip();
export type JsonListEventsParametersResponseSchemaType = z.infer<typeof JsonListEventsParametersResponseSchema>;
