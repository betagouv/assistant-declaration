import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

//
// Below we only focus on properties we need to avoid issues if the rest of the schema evolves
//

export const BilletSchema = applyTypedParsers(
  z.object({
    tarif: z.string().min(1),
    prix_unitaire_ttc: z.coerce.number().nonnegative(),
    nb_billets_vendus: z.coerce.number().int().nonnegative(),
    taux_tva: z.coerce.number().nonnegative(),
    // total_ht: z.coerce.number().nonnegative(),
    // tva: z.coerce.number().nonnegative(),
    // total_ttc: z.coerce.number().nonnegative(),
  })
);

export const TotauxSchema = applyTypedParsers(
  z.object({
    nb_billets_vendus: z.number().int().nonnegative(),
    total_ht: z.number().nonnegative(),
    tva: z.number().nonnegative(),
    total_ttc: z.number().nonnegative(),
  })
);

export const JsonGetSpectaclesResponseSchema = applyTypedParsers(
  z
    .object({
      error: z.literal(0),
      data: z.record(
        z.coerce.number(),
        z.object({
          id_spectacle: z.number().int().nonnegative(),
          name: z.string().min(1),
          representations: z.record(
            z.coerce.number(),
            z.object({
              id_representation: z.number().int().nonnegative(),
              start: z.number().int().nonnegative(),
              // hall: z.object({
              //   id: z.number().int().nonnegative(),
              //   name: z.string().min(1),
              //   address: z.string(),
              //   zipcode: z.string(),
              //   city: z.string(),
              // }),
            })
          ),
        })
      ),
    })
    .strip()
);
export type JsonGetSpectaclesResponseSchemaType = z.infer<typeof JsonGetSpectaclesResponseSchema>;

export const JsonGetRepresentationsResponseSchema = applyTypedParsers(
  z
    .object({
      spectacle: z.object({
        name: z.string().min(1),
        id: z.number().int().nonnegative(),
      }),
      representation: z.object({
        id: z.number().int().nonnegative(),
        // label: z.string().min(1),
      }),
      declaration: z.object({
        billets: z.object({
          payants: z.array(BilletSchema),
          gratuits: z.array(BilletSchema),
        }),
        // totaux: z.object({
        //   payants: TotauxSchema,
        //   gratuits: TotauxSchema,
        // }),
      }),
    })
    .strip()
);
export type JsonGetRepresentationsResponseSchemaType = z.infer<typeof JsonGetRepresentationsResponseSchema>;
