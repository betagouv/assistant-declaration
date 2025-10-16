import { fr } from '@codegouvfr/react-dsfr';
import { Accordion } from '@codegouvfr/react-dsfr/Accordion';

export function FrequentlyAskedQuestions() {
  return (
    <div className={fr.cx('fr-container', 'fr-py-12v')}>
      <div className={fr.cx('fr-grid-row', 'fr-grid-row--center')}>
        <div className={fr.cx('fr-col-md-8')}>
          <h2 className={fr.cx('fr-h4')}>Foire aux questions | FAQ</h2>
          <ul className={fr.cx('fr-accordions-group')}>
            <li>
              <Accordion label="À quoi sert l'assistant ?">
                L&apos;assistant aide les diffuseurs à réaliser les déclarations post-spectacles suivantes :
                <ul>
                  <li>État des recettes et des dépenses Sacem</li>
                  <li>Bordereau de recettes et/ou dépenses SACD</li>
                </ul>
                L&apos;assistant précalcule automatiquement la synthèse des données de billetteries d&apos;un spectacle : recette totale, nombre de
                billets vendus, nombre d&apos;invitations, prix moyen du billet.
              </Accordion>
            </li>
            <li>
              <Accordion label="J'ai déjà un outil de suivi des mes spectacles pour faire mes déclarations (un fichier Excel par exemple), comment l'assistant peut-il m'aider ?">
                L&apos;assistant récupère les données de recettes détaillées de votre logiciel de billetterie et précalcule automatiquement pour un
                spectacle : la recette totale , le nombre de billets vendus, le nombre d&apos;invitations, le prix moyen du billet.
                <br />
                Ces données sont utilisables directement pour remplir les formulaires ou pour compléter votre outil.
              </Accordion>
            </li>
            <li>
              <Accordion label="Comment puis-je être sûr que les données de l'assistant sont fiables ?">
                Les données de l&apos;assistant sont le reflet des données de votre logiciel de billetterie. L&apos;assistant vous permet de vérifier,
                compléter et corriger ces données si nécessaire. À noter que les données corrigées s&apos;appliquent pour l&apos;ensemble des
                déclarations aux différent organismes.
                <br />
                <span className={fr.cx('fr-text--bold')}>
                  N.B : l&apos;assistant ne peut se substituer à votre logiciel de billetterie. Avant de synchroniser vos données de recettes avec
                  l&apos;assistant, n&apos;oubliez pas de les mettre à jour dans votre logiciel pour faire vos déclarations.
                </span>
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que je peux utiliser l'assistant pour remplir les formulaires Sacem et SACD ?">
                Oui l&apos;assistant s&apos;adapte aux pratiques déclaratives les plus répandues. Il permet de générer le formulaire PDF de la Sacem
                et de la SACD, mais aussi de copier-coller la recette totale, le nombre de billets vendus, le nombre d&apos;invitations, nécessaires
                aux formulaires en ligne SACD.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'assistant me permet de filtrer la ou les déclaration(s) que je dois faire pour un spectacle donné ?">
                Non, l&apos;assistant ne permet pas de filtrer les déclarations à réaliser pour un spectacle. Même s&apos;il est possible
                d&apos;établir des règles générales selon le genre du spectacle (musique, danse, théâtre...), il y a de nombreux cas particuliers (par
                exemple pour les spectacles d&apos;humour) qui ne permettent pas de mettre en place une règle pour déterminer automatiquement si un
                spectacle relève de la Sacem ou de la SACD. En cas de doute nous vous recommandons de contacter vos gestionnaires de proximité.
              </Accordion>
            </li>
            <li>
              <Accordion label="Je déclare via le site web de l'organisme, comment puis-je utiliser l'assistant ?">
                Vous pouvez utiliser les données que précalcule l&apos;assistant à partir des données de billetteries : recette totale, nombre de
                billets vendus, nombre d&apos;invitations, prix moyen du billet.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'assistant transmet automatiquement les données aux organismes ?">
                À ce stade l&apos;assistant ne permet pas la télédéclaration aux organismes.
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que les organismes ont un accès direct à mes données ?">
                Non, les données restent sous votre contrôle dans l&apos;assistant. Il n&apos;y a pas de transmission automatique de vos données aux
                organismes.
              </Accordion>
            </li>
            <li>
              <Accordion label="Puis-je vérifier les données avant de les transmettre ?">
                L&apos;assistant permet de vérifier la recette de billetterie pour un spectacle ainsi que de corriger ou ajouter des billets.
                <br />
                Il est aussi possible de prévisualiser les formulaires PDF remplis de la Sacem et de la SACD avant de les télécharger.
              </Accordion>
            </li>
            <li>
              <Accordion label="Quels sont les systèmes de billetterie compatibles ?">
                Ll&apos;assistant peut actuellement récupérer vos données de billetterie depuis :
                <ul>
                  <li>Billetweb</li>
                  <li>Mapado</li>
                  <li>Supersoniks</li>
                  <li>SoTicket</li>
                </ul>
              </Accordion>
            </li>
            <li>
              <Accordion label="Est-ce que l'assistant permet d'envoyer un email aux organismes ?">
                Non, l&apos;assistant vous aide dans la complétion des formulaires PDF ou en ligne. L&apos;envoi d&apos;un email avec le formulaire
                type et les pièces justificatives demandées par l&apos;organisme restent de votre ressort.
              </Accordion>
            </li>
            <li>
              <Accordion label="Combien coûte l'utilisation de l'assistant pour les déclarations ?">
                L&apos;utilisation de l&apos;assistant est gratuite.
              </Accordion>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
