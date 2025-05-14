import { fr } from '@codegouvfr/react-dsfr';
import { ExpandMore } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Container, Grid, Typography } from '@mui/material';

export function FrequentlyAskedQuestions() {
  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={{
        bgcolor: fr.colors.decisions.background.alt.blueFrance.default,
        pt: { xs: 4, md: 4 },
        pb: { xs: 4, md: 8 },
      }}
    >
      <Container>
        <Typography component="h2" variant="h4" sx={{ mt: 1, mb: { xs: 2, sm: 4 } }}>
          Les questions-réponses pour en savoir plus
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>À quoi sert l&apos;assistant ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                L&apos;assistant aide les diffuseurs à réaliser les déclarations post-spectacles suivantes :
                <ul>
                  <li>État des recettes et des dépenses SACEM</li>
                  <li>Bordereau de recettes et/ou dépenses SACD</li>
                  <li>Taxe sur le spectacle CNM et ASTP</li>
                </ul>
                L&apos;assistant précalcule automatiquement la synthèse des données de billetteries d&apos;un spectacle : recette totale, nombre de
                billets vendus, nombre d&apos;invitations, prix moyen du billet.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>
                  J&apos;ai déjà un outil de suivi des mes spectacles pour faire mes déclarations (un fichier Excel par exemple), comment
                  l&apos;assistant peut-il m&apos;aider ?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                L&apos;assistant récupère les données de recettes détaillées de votre logiciel de billetterie et précalcule automatiquement pour un
                spectacle : la recette totale , le nombre de billets vendus, le nombre d&apos;invitations, le prix moyen du billet.
                <br />
                Ces données sont utilisables directement pour remplir les formulaires ou pour compléter votre outil.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Comment puis-je être sûr que les données de l&apos;assistant sont fiables ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                Les données de l&apos;assistant sont le reflet des données de votre logiciel de billetterie. L&apos;assistant vous permet de vérifier,
                compléter et corriger ces données si nécessaire. À noter que les données corrigées s&apos;appliquent pour l&apos;ensemble des
                déclarations aux différent organismes.
                <br />
                <Typography component="span" sx={{ fontWeight: 600 }}>
                  N.B : l&apos;assistant ne peut se substituer à votre logiciel de billetterie. Avant de synchroniser vos données de recettes avec
                  l&apos;assistant, n&apos;oubliez pas de les mettre à jour dans votre logiciel pour faire vos déclarations.
                </Typography>
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>
                  Est-ce que je peux utiliser l&apos;assistant pour remplir les formulaires SACEM, SACD, CNM, ASTP ?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                Oui l&apos;assistant s&apos;adapte aux pratiques déclaratives les plus répandues. Il permet de générer le formulaire PDF de la SACEM
                et de la SACD, mais aussi de copier-coller la recette totale, le nombre de billets vendus, le nombre d&apos;invitations, nécessaires
                aux formulaires en ligne CNM, ASTP et SACD.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>
                  Est-ce que l&apos;assistant me permet de filtrer la ou les déclaration(s) que je dois faire pour un spectacle donné ?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                Non, l&apos;assistant ne permet pas de filtrer les déclarations à réaliser pour un spectacle. Même s&apos;il est possible
                d&apos;établir des règles générales selon le genre du spectacle (musique, danse, théâtre...), il y a de nombreux cas particuliers (par
                exemple pour les spectacles d&apos;humour) qui ne permettent pas de mettre en place une règle pour déterminer automatiquement si un
                spectacle relève de la SACEM, de la SACD, du CNM et/ou de l&apos;ASTP. En cas de doute nous vous recommandons de contacter vos
                gestionnaires de proximité.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>
                  Je déclare via le site web de l&apos;organisme, comment puis-je utiliser l&apos;assistant ?
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                Vous pouvez utiliser les données que précalcule l&apos;assistant à partir des données de billetteries : recette totale, nombre de
                billets vendus, nombre d&apos;invitations, prix moyen du billet.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Est-ce que l&apos;assistant transmet automatiquement les données aux organismes ?</Typography>
              </AccordionSummary>
              <AccordionDetails>A ce stade l&apos;assistant ne permet pas la télédéclaration aux organismes.</AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Est-ce que les organismes ont un accès direct à mes données ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                Non, les données restent sous votre contrôle dans l&apos;assistant. Il n&apos;y a pas de transmission automatique de vos données aux
                organismes.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Puis-je vérifier les données avant de les transmettre ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                L&apos;assistant permet de vérifier la recette de billetterie pour un spectacle ainsi que de corriger ou ajouter des billets.
                <br />
                Il est aussi possible de prévisualiser les formulaires PDF remplis de la SACEM et de la SACD avant de les télécharger.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Quels sont les systèmes de billetterie compatibles ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                Ll&apos;assistant peut actuellement récupérer vos données de billetterie depuis :
                <ul>
                  <li>Billetweb</li>
                  <li>Mapado</li>
                  <li>Supersoniks</li>
                  <li>SoTicket</li>
                </ul>
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Est-ce que l&apos;assistant permet d&apos;envoyer un email aux organismes ?</Typography>
              </AccordionSummary>
              <AccordionDetails>
                Non, l&apos;assistant vous aide dans la complétion des formulaires PDF ou en ligne. L&apos;envoi d&apos;un email avec le formulaire
                type et les pièces justificatives demandées par l&apos;organisme restent de votre ressort.
              </AccordionDetails>
            </Accordion>
            <Accordion sx={{ boxShadow: 'none' }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography sx={{ fontWeight: 600 }}>Combien coûte l&apos;utilisation de l&apos;assistant pour les déclarations ?</Typography>
              </AccordionSummary>
              <AccordionDetails>L&apos;utilisation de l&apos;assistant est gratuite.</AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Container>
    </Container>
  );
}
