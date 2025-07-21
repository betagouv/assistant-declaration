import { z } from 'zod';

import { applyTypedParsers } from '@ad/src/utils/zod';

export const JsonErrorResponseSchema = z.object({ Error: z.object({ Code: z.string().min(1), Message: z.string().min(1) }) });
export type JsonErrorResponseSchemaType = z.infer<typeof JsonErrorResponseSchema>;

export const JsonHelloWorldResponseSchema = z.object({ Result: z.literal('Hello World!') });
export type JsonHelloWorldResponseSchemaType = z.infer<typeof JsonHelloWorldResponseSchema>;

export const JsonLoginResponseSchema = z.object({ AuthToken: z.string().min(1) });
export type JsonLoginResponseSchemaType = z.infer<typeof JsonLoginResponseSchema>;

export const JsonDeclarationParameterTypeRefSchema = z.enum(['SACD', 'INTERNE', 'SIRET', 'SIREN', 'LICENCE']);
export type JsonDeclarationParameterTypeRefSchemaType = z.infer<typeof JsonDeclarationParameterTypeRefSchema>;

export const JsonDeclarationParameterSchema = applyTypedParsers(
  z.object({
    Declaration: z.object({
      Header: z.object({
        dec_ref: z.string(),
        dec_systeme: z.string(),
        dec_version: z.string().optional(),
        dec_date: z.string(),
        dec_nb: z.number().int(),
      }),
      Representations: z.object({
        Representation: z.array(
          z.object({
            rep_ref_dec: z.string().optional(),
            rep_devise: z.string(),
            rep_statut: z.enum(['PRG', 'DEF']).optional(),
            rep_version: z.string(),
            rep_titre: z.string(),
            rep_date_debut: z.string(),
            rep_date_fin: z.string(),
            rep_nb: z.number().int(),
            rep_horaire: z.string(),
            Billetterie: z.object({
              rep_mt_billets: z.number().optional(),
              rep_tx_tva_billets: z.number().optional(),
              rep_mt_tva_billets: z.number().optional(),
              rep_nb_billets_pay: z.number().int().optional(),
              rep_nb_billets_exo: z.number().int().optional(),
            }),
            Exploitation: z.object({
              rep_mt_cession: z.number().optional(),
              rep_tx_tva_cession: z.number().optional(),
              rep_mt_tva_cession: z.number().optional(),
              rep_mt_frais: z.number().optional(),
              rep_mt_apports_coprod: z.number().optional(),
              rep_mt_garantie_rec: z.number().optional(),
              rep_mt_depenses: z.number().optional(),
              rep_mt_autres: z.number().optional(),
              expl_nat: z.enum(['AMA', 'PRO']).optional(),
              expl_type_ref: JsonDeclarationParameterTypeRefSchema.optional(),
              expl_ref: z.string().optional(),
              rep_public: z.string().optional(),
              rep_type_diff: z.string().optional(),
            }),
            Salle: z.object({
              salle_nom: z.string(),
              salle_type_ref: JsonDeclarationParameterTypeRefSchema.optional(),
              salle_ref: z.string().optional(),
              salle_type_lieu: z.string().optional(),
              salle_jauge: z.number().int().optional(),
              salle_prix_moyen: z.number().optional(),
            }),
            Diffuseur: z.object({
              diff_nom: z.string().optional(),
              diff_type_ref: JsonDeclarationParameterTypeRefSchema.optional(),
              diff_ref: z.string().optional(),
              diff_adresse_1: z.string().optional(),
              diff_adresse_2: z.string().optional(),
              diff_code_postal: z.string().optional(),
              diff_ville: z.string(),
              diff_pays: z.string(),
              diff_tel: z.string().optional(),
              diff_mel: z.string().optional(),
              diff_tva: z.string().optional(),
            }),
            Producteur: z.object({
              prod_nom: z.string().optional(),
              prod_type_ref: JsonDeclarationParameterTypeRefSchema.optional(),
              prod_ref: z.string().optional(),
              prod_adresse_1: z.string().optional(),
              prod_adresse_2: z.string().optional(),
              prod_code_postal: z.string().optional(),
              prod_ville: z.string().optional(),
              prod_pays: z.string().optional(),
              prod_tel: z.string().optional(),
              prod_mel: z.string().optional(),
              prod_tva: z.string().optional(),
            }),
          })
        ),
      }),
    }),
  })
);
export type JsonDeclarationParameterSchemaType = z.infer<typeof JsonDeclarationParameterSchema>;

export const JsonRepresentationSchema = z
  .object({
    rep_ref_dec: z.string().optional(),
    numero: z.string(),
    statut: z.enum(['KO', 'OK', 'WARNING']),
    champ: z.string().optional(),
    message: z.string().optional(),
  })
  .strip();
export type JsonRepresentationSchemaType = z.infer<typeof JsonRepresentationSchema>;

export const JsonDeclareResponseSchema = z
  .object({
    Declaration: z.object({
      Header: z.object({
        dec_ref: z.string(),
        dec_nb: z.coerce.number().int(),
        sacd_date: z.string(),
      }),
      Representations: z.object({
        Representation: z.array(JsonRepresentationSchema).or(JsonRepresentationSchema), // If there is only 1 item it won't be an array
      }),
    }),
  })
  .strip();
export type JsonDeclareResponseSchemaType = z.infer<typeof JsonDeclareResponseSchema>;
