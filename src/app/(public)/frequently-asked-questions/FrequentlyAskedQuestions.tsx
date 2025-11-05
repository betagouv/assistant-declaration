import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';
import NextLink from 'next/link';

export function FrequentlyAskedQuestions() {
  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-md-8')}>
          <h2 className={fr.cx('fr-h4')}>Foire aux questions | FAQ</h2>
          <ul className={fr.cx('fr-accordions-group')}>
            <li>
              <Accordion label="À quoi sert l'Assistant Déclaration ?">
                L&apos;Assistant aide les organisateurs à réaliser les déclarations post-spectacles pour la SACEM et la SACD.
                <br />
                <br />À terme, l&apos;Assistant permettra aussi de déclarer la taxe sur le spectacle au CNM et à l&apos;ASTP et alimentera{' '}
                <NextLink
                  href="https://www.culture.gouv.fr/thematiques/theatre-spectacles/pour-les-professionnels/sibil-systeme-d-information-billetterie"
                  target="_blank"
                >
                  SIBIL
                </NextLink>
                , le système d&apos;information de billetterie du Ministère de la Culture.
              </Accordion>
            </li>
            <li>
              <Accordion label="À qui l'Assistant est-il destiné ?">
                La version actuelle de l&apos;Assistant est destinée aux <span className={fr.cx('fr-text--bold')}>organisateurs de spectacle</span>,
                c&apos;est-à-dire{' '}
                <span className={fr.cx('fr-text--bold')}>tous·tes les entrepreneur·es de spectacles avec une licence de type 3</span> délivrée par le
                ministère de la Culture. Vous souhaitez renouveler votre licence ? Rendez-vous{' '}
                <NextLink href="https://demarches.numerique.gouv.fr/commencer/renouvellement-licence-esv" target="_blank">
                  sur cette page
                </NextLink>
                .
                <br />
                <br />À noter que la version actuelle de l&apos;Assistant ne permet pas de réaliser les formalités des producteurs de spectacles ni de
                déclarer les festivals.
              </Accordion>
            </li>
            <li>
              <Accordion label="Comment fonctionne l'Assistant ?">
                L&apos;Assistant a été conçu pour <span className={fr.cx('fr-text--bold')}>simplifier vos démarches</span> en limitant au maximum les
                saisies manuelles et en <span className={fr.cx('fr-text--bold')}>réutilisant automatiquement les données</span> déjà présentes dans
                vos logiciels de billetterie.
                <br />
                <br />
                Grâce à un <span className={fr.cx('fr-text--bold')}>formulaire unique</span>, il centralise toutes les informations nécessaires à vos
                déclarations.
                <br />
                <br />
                L&apos;Assistant <span className={fr.cx('fr-text--bold')}>récupère directement depuis votre logiciel de billetterie</span> la liste
                des spectacles ainsi que les <span className={fr.cx('fr-text--bold')}>dates et horaires de chaque représentation</span>.
                <br />
                <br />
                Il <span className={fr.cx('fr-text--bold')}>préremplit automatiquement la synthèse des données de billetterie</span> pour chaque
                spectacle : recettes, nombre de billets vendus, nombre d&apos;invitations, prix moyen du billet.
                <br />
                <br />À noter que l&apos;Assistant est actuellement{' '}
                <span className={fr.cx('fr-text--bold')}>compatible uniquement avec votre logiciel de billetterie principal</span>.
                <br />
                <br />
                La <span className={fr.cx('fr-text--bold')}>connexion sécurisée</span> à ce logiciel est donc un{' '}
                <span className={fr.cx('fr-text--bold')}>prérequis indispensable</span> pour utiliser la version actuelle de l&apos;Assistant.
                <br />
                <br />
                Grâce à cette connexion, l&apos;Assistant peut récupérer automatiquement les noms des spectacles, les dates et horaires des
                représentations ainsi que toutes les données de billetterie associées à chaque séance.
              </Accordion>
            </li>
            <li>
              <Accordion label="Comment puis-je être sûr·e que les données de l'Assistant sont fiables ?">
                Les données de l&apos;Assistant sont le reflet des données de votre logiciel de billetterie. Si nécessaire, vous pouvez vérifier,
                compléter et corriger ces données.
                <br />
                <br />
                <span className={fr.cx('fr-text--bold')}>
                  L&apos;Assistant ne peut se substituer à votre logiciel de billetterie. Avant de synchroniser vos données de recettes avec
                  l&apos;Assistant, n&apos;oubliez pas de les mettre à jour dans votre logiciel pour faire vos déclarations.
                </span>
              </Accordion>
            </li>
            <li>
              <Accordion label="Puis-je ajouter des spectacles, des représentations ou des billets à la main dans l'Assistant ?">
                Pour le moment, l&apos;Assistant ne permet ni d&apos;ajouter de spectacle, de représentation ou de catégorie de billets à la main car
                il s&apos;appuie sur les données de votre logiciel de billetterie. L&apos;ajout des spectacles, représentations et billets vendus doit
                donc se faire directement dans votre logiciel de billetterie.
                <br />
                <br />
                L&apos;Assistant vous permet néanmoins de modifier les données au niveau de chaque représentation : le nombre de billets, le montant
                de la recette, le lieu.
                <br />
                <br />
                <span className={fr.cx('fr-text--bold')}>
                  N.B. : Pour les déclarant·es qui ne renseignent pas les représentations gratuites dans leur logiciel de billetterie principal, la
                  plupart des éditeurs de logiciels permettent, pour un spectacle, d&apos;ajouter des séances sans vente de billet. Si vous êtes dans
                  cette situation, nous vous invitons à solliciter le support de votre éditeur pour vous guider.
                </span>
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que je peux utiliser l'Assistant pour envoyer automatiquement les formulaires SACEM, SACD, CNM, ASTP ?">
                L&apos;Assistant permet de remplir une seule fois les champs des formulaires SACEM et SACD et d&apos;envoyer automatiquement les
                formulaires à ces 2 organismes.
                <br />
                <br />À terme, l&apos;Assistant permettra aussi de remplir et envoyer les formalités demandées par le CNM et l&apos;ASTP ainsi
                qu&apos;au ministère de la Culture pour ce qui concerne SIBIL.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'Assistant permet de filtrer la ou les déclaration(s) que je dois faire pour un spectacle donné ?">
                Non, l&apos;Assistant ne permet pas de filtrer les déclarations à réaliser pour un spectacle. Même s&apos;il est possible
                d&apos;établir des règles générales selon le genre du spectacle (musique, danse, théâtre, etc.) il y a de nombreux cas particuliers
                (ex. : spectacles d&apos;humour) qui ne permettent pas de mettre en place une règle pour déterminer automatiquement si un spectacle
                relève de la SACEM et/ou de la SACD, du CNM et/ou de l&apos;ASTP. En cas de doute nous vous recommandons de contacter vos
                gestionnaires de proximité.
              </Accordion>
            </li>
            <li>
              <Accordion label="Je déclare via le site web de l'organisme, comment puis-je utiliser l'Assistant ?">
                Vous pourriez utiliser les données que précalcule l&apos;Assistant à partir des données de billetterie : recette totale, nombre de
                billets vendus, nombre d&apos;invitations, prix moyen du billet. Mais le plus simple reste encore de tester l&apos;Assistant 😉 !
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'assistant transmet automatiquement les données aux organismes ?">
                Oui l&apos;Assistant envoie automatiquement les formalités aux organismes (SACEM et SACD pour le moment). <br />
                <br />
                Si la télétransmission à la SACD ne fonctionne pas, vous pouvez contacter directement votre interlocuteur·ice SACD afin
                qu&apos;il·elle active cette option.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que les organismes ont accès directement à mes données ?">
                Seules les données saisies dans la partie déclaration de l&apos;Assistant sont transmises aux organismes.
              </Accordion>
            </li>
            <li>
              <Accordion label="Puis-je vérifier les données pré remplies avant de les transmettre ?">
                La connexion avec votre logiciel de billetterie principal permet de récupérer le nom des spectacles, les dates de représentations et
                les données de billetteries pour chaque représentation.
                <br />
                <br />
                L&apos;Assistant permet de vérifier la recette de billetterie <span className={fr.cx('fr-text--bold')}>par représentation</span> pour
                un spectacle ainsi que de corriger ou ajouter des billets. A noter que les données de billetteries pré remplies sont modifiables.
              </Accordion>
            </li>
            <li>
              <Accordion label="Quels sont les systèmes de billetterie compatibles ?">
                À date, l&apos;Assistant peut récupérer vos données de billetteries sur BilletWeb, Mapado, Supersoniks / Soticket, Shotgun et
                HelloAsso.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'Assistant permet d'envoyer les pièces-jointes aux organismes ?">
                Oui, l&apos;Assistant envoie automatiquement à votre correspondant·e local·e les pièces-jointes que vous déposez sur le formulaire de
                déclaration.
              </Accordion>
            </li>
            <li>
              <Accordion label="Combien coûte l'utilisation de l'Assistant pour les déclarations ?">
                L&apos;utilisation de l&apos;Assistant est gratuite.
              </Accordion>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
