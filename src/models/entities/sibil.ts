import { z } from 'zod';

export const JsonErrorResponseSchema = z
  .object(
    {
      errorKey: z.string().min(1),
      title: z.string().min(1),
      status: z.number(),
      message: z.string().min(1),
    }
    // // Sample
    // {
    //   "entityName": "declaration",
    //   "errorKey": "errorsDataSib",
    //   "type": "http://www.jhipster.tech/problem/problem-with-message",
    //   "title": "Une déclaration existe déjà dans la base de données SIBIL avec les mêmes données saisies",
    //   "status": 400,
    //   "message": "error.errorsDataSib",
    //   "params": "declaration"
    // }
  )
  .strip();
export type JsonErrorResponseSchemaType = z.infer<typeof JsonErrorResponseSchema>;

export const JsonPlaceTypeSchema = z.enum([
  'THEATRE',
  'ESPACE_POLYVALENT',
  'CASINO_DISCOTHEQUE_HOTEL_CAFE_RESTAURANT',
  'SALLE_CONCERT_AUDITORIUM_OPERA_ZENITH',
  'CABARET_MUSIC_HALL',
  'PLEIN_AIR_PARC_LOISIRS_ATTRACTION',
  'STRUCTURE_ITINERANTE_DEMONTABLE_CHAPITEAU',
  'LIEU_DE_CULTE',
  'LIEU_DE_SANTE',
  'AUTRE',
]);
export type JsonPlaceTypeSchemaType = z.infer<typeof JsonPlaceTypeSchema>;

export const JsonPlaceTypesResponseSchema = z
  .array(
    z
      .object({
        code: JsonPlaceTypeSchema,
        value: z.string().min(1),
      })
      .strip()
  )
  .min(1);
export type JsonPlaceTypesResponseSchemaType = z.infer<typeof JsonPlaceTypesResponseSchema>;

export const JsonPerformanceTypesResponseSchema = z
  .array(
    z
      .object({
        id: z.int().nonnegative(),
        libelle: z.string().min(1),
        // "libelleV1": z.string().min(1).nullable(),
        // "libelleTri": z.string().min(1).nullable(),
        // "dateCreation": z.coerce.date(),
        // "dateModification": z.coerce.date().nullable(),
        actif: z.boolean(),
      })
      .strip()
  )
  .min(1);
export type JsonPerformanceTypesResponseSchemaType = z.infer<typeof JsonPerformanceTypesResponseSchema>;

export const JsonSuccessfulLoginResponseSchema = z
  .object({
    id_token: z.string().min(1),
    typeError: z.literal('AUTHENTICATED'),
    versions: z.unknown(),
  })
  .strip();
export type JsonSuccessfulLoginResponseSchemaType = z.infer<typeof JsonSuccessfulLoginResponseSchema>;

export const JsonFailedLoginResponseSchema = z
  .object({
    id_token: z.literal(''),
    typeError: z.literal('NOT AUTHENTICATED'),
    versions: z.unknown(),
  })
  .strip();
export type JsonFailedLoginResponseSchemaType = z.infer<typeof JsonFailedLoginResponseSchema>;

export const JsonCreateDeclarationResponseSchema = z
  .object({
    id: z.int().nonnegative(),
    idExtBilletterie: z.string().min(1),
    // version: 2,
    // dateHeureRepresentationUnique: '2025-01-01T09:00:00Z',
    // dateDebut: null,
    // dateFin: null,
    // nbRepresentations: 1,
    // nbBilletsTotalBilletterie: 1004,
    // recetteTotalBilletterie: 44444,
    // prixMoyenTotalBilletterie: 44.27,
    // nbBilletsTarifPlein: 0,
    // recetteTarifPlein: 0,
    // prixMoyenTarifPlein: 0,
    // nbBilletsTarifAbonnementForfait: 0,
    // nbBilletsExoneres: 0,
    // jauge: 2000,
    // statutDeclaration: 'ENREGISTRE',
    // codeErreur: null,
    // dateCreation: '2025-12-18T20:18:38.433Z',
    // dateModification: '2025-12-18T19:23:00.203Z',
    // spectacleId: 1830,
    // spectacleCritere1: "D'autres",
    // festivalId: null,
    // festivalNom: null,
    // declarantId: 5871,
    // nomJuridiqueOrganismeDeclarant: 'COUCOU',
    // lieuId: 27422,
    // lieuNom: 'DASDAS',
    // demandeurId: 7845,
    // demandeurLogin: 'assistant-declaration',
    // lieuChamps: {
    //   id: 27422,
    //   nom: 'DASDAS',
    //   codePostal: '35341',
    //   ville: 'LIFFRÉ',
    //   adresse: 'RUE DU COURTILLON',
    //   siret: null,
    //   validationApiExterne: false,
    //   typeLieu: 'THEATRE',
    //   statut: 'VALIDE',
    //   dateCreation: '2025-12-17T17:59:46.718Z',
    //   dateModification: '2025-12-18T01:40:46.489334Z',
    //   contributeurId: 7845,
    //   contributeurLogin: 'assistant-declaration',
    //   validateurId: null,
    //   validateurLogin: null,
    //   codError: null,
    //   departementId: 36,
    //   departementCode: '35',
    //   departementLibelle: 'Ille-et-Vilaine',
    //   denominationUsuelle: 'DasDas',
    //   parentId: null,
    //   parentNom: null
    // },
    // festivalChamps: null,
    // spectacleChamps: {
    //   id: 1830,
    //   critere1: "D'autres",
    //   critere2: 'Tiphanie Bovay-Klameth',
    //   critere3: 'Tiphanie Bovay-Klameth',
    //   critere4: 'Tiphanie Bovay-Klameth',
    //   statut: 'VALIDE',
    //   dateCreation: '2018-06-27T10:35:24.585Z',
    //   dateModification: '2020-10-28T00:18:55.281Z',
    //   contributeurId: null,
    //   contributeurLogin: null,
    //   validateurId: null,
    //   validateurLogin: null,
    //   domaineSpectacleId: 1,
    //   domaineSpectacleLibelle: 'Théâtre',
    //   codError: null,
    //   nombreDenfants: null,
    //   parentId: null,
    //   parentNom: null
    // },
    // domaineRepresentationId: 1,
    // domaineRepresentationLibelle: 'Théâtre',
    // jeunePublic: true,
    // valide: true,
    // gestionnaireMultiple: true,
    // departement: null,
    // region: null,
    // role: null,
    // nbBilletsTarifPayant: null,
    // recetteTarifPayant: null,
    // prixMoyenTarifPayant: null,
    // nbBilletsTarifNormal: null,
    // recetteTarifNormal: null,
    // prixMoyenTarifNormal: null,
    // coProduction: false
  })
  .strip();
export type JsonCreateDeclarationResponseSchemaType = z.infer<typeof JsonCreateDeclarationResponseSchema>;
