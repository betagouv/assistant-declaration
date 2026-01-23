# Technical Architecture Document (TAD)

> The following just provides architectural information with a canvas common to all projects in our organization. It's not an installation guide nor a specification document.

**Project name:** Assistant déclaration

**Code repository:** https://github.com/betagouv/assistant-declaration

**Application host (provider and _region_):**

- Development environment: Scalingo _(osc-fr1)_
- Production environment: Scalingo _(osc-secnum-fr1)_

**Homologation outcome:** ❌

## Tracking

> The tracking of this document is made through the Git versioning.

## Contributors

> Below table details each contributor and their role in the writing of the TAD.

| Organization          | Name        | Role      | Action  |
| --------------------- | ----------- | --------- | ------- |
| Assistant déclaration | Thomas Ramé | Tech lead | Writing |

## Project description

A french national platform helping live performance entrepreneurs leverage their ticketing software to pre-fill administrative declarations.

## Architecture

### Stack

_(When appropriate we describe the motivation of the choice)_

- Node.js
- TypeScript (used for both the frontend and the backend to mutualise utils and to simplify the stack)
- React (client-side)
- Responsive integration of the frontend
- RDBMS database (PostgreSQL to benefit from custom objects, to store files, and to manage the job queues)
- Next.js (framework to manage both the client and server)
- Prisma (database ORM to get typings dealing with requests)
- tRPC (used for client-server communication) (it's like GraphQL but "natively" using TypeScript schemas)
- npm (package manager)
- GitHub
- GitHub Actions (for the CI/CD)
- Scalingo (serverless provider, no Kubernetes or whatever)
- DSFR + MUI (UI frameworks)
- Storybook through Chromatic (helps collaborating with the non-technical team members and also bring more chance to have our components reused among the community) (also performs visual testing)
- Figma (to design any part of the project and collaborate)
- Jest (unit tests)
- axe-core (integrated within Storybook to perform accessibility testing)
- Buildpack (the final application bundle)
- Sentry (detection and reporting of errors)
- Scaleway (used to send emails)
- Brevo (used as a fallback of Scaleway to send emails)
- Crisp (for customer support but only loaded if the user explicitly triggers a button)
- Metabase (for the needs of following the impact of the project)

### Communication matrix

| Source     | Destination                | Protocol | Port | Location      | Type                                                     |
| ---------- | -------------------------- | -------- | ---- | ------------- | -------------------------------------------------------- |
| Frontend   | Backend                    | HTTPS    | 443  | Paris, France | Internal                                                 |
| Frontend   | Sentry                     | HTTPS    | 443  | Tours, France | External (sentry.incubateur.net)                         |
| Frontend   | Matomo                     | HTTPS    | 443  | Tours, France | External (stats.beta.gouv.fr)                            |
| Frontend   | Crisp                      | HTTPS    | 443  | France        | External (client.crisp.chat and client.relay.crisp.chat) |
| Backend    | PostgreSQL                 | TCP      | -    | Paris, France | Internal                                                 |
| Backend    | Sentry                     | HTTPS    | 443  | Paris, France | External (sentry.incubateur.net)                         |
| Backend    | Matomo                     | HTTPS    | 443  | Tours, France | External (stats.beta.gouv.fr)                            |
| Backend    | Scaleway                   | SMTP     | 465  | Paris, France | External (smtp.tem.scw.cloud)                            |
| Backend    | Brevo                      | SMTP     | 587  | Paris, France | External (smtp-relay.sendinblue.com)                     |
| Backend    | \* _(ticketing systems)_   | HTTPS    | 443  | \*            | External (\*)                                            |
| Backend    | \* _(declaration systems)_ | HTTPS    | 443  | \*            | External (\*)                                            |
| PostgreSQL | Metabase                   | TCP      | -    | Paris, France | Internal                                                 |

**Note we list all flows known in advance except the wildcard entries. This is because `Assistant déclaration` relies on multiple ticketing and declaration systems that evolve over time and where sometimes the domain is non-disclosure. Note ticketing endpoints are just for read-only purposes and no user data is sent to their servers except to authenticate the call, unlike declaration ones that are used to push information.**

<!-- We used https://www.site24x7.com/tools/find-website-location.html to find locations -->

### Dependencies

| Target      | Dependency | Version  | Comment                                                                                       |
| ----------- | ---------- | -------- | --------------------------------------------------------------------------------------------- |
| Application | Librairies | -        | Listed in `/package.json` (the entire dependency tree is available into `/package-lock.json`) |
| Application | PostgreSQL | `v15.8+` | The version can differ due to provider upgrades                                               |

### Services diagram

![Services diagram](services_diagram.drawio.svg 'Services diagram')

### Database structure diagram

We do not commit the database structure directly since some initialization can be done by our librairies (ORM, queueing system...).

To get a meaningful overview we advise you to:

1. Follow usage instructions within the `README.md` to launch the application locally
2. Download and launch the database tool `DBeaver` that is open source
3. Configure it by using connection information from the `/.env.test`
4. In the menu, under your connection open `Databases > xxxx > Schemas`
5. On each schema (`public` and `pgboss` currently), right click and select `View diagram`

Those are interactive entity relationship diagrams representing the entire database.

## Requirements

**The following is about the production environment. We would not expand on a development environment because it would store fake data, and would give a bit more priviliges to developers to test and debug, but still, it would totally be isolated from the production.**

### Server access and communication security

Since the provider Scalingo does not allow assigning specific roles to collaborators, it means someone having the access has full access.

Considering this we chose:

- to give all developers an access in the development environment
- to give only the main developer an access in the production environment

All team members are required to use the 2FA in Scalingo and to use a secure password manager to generate have credentials not guessable.

### Application authentication and access control

The access to the protected application dashboard is only done through authentication.

There are 2 kinds of users:

- **Admins**: ability to have an overview of entrepreneurs data
- **Entrepreneurs**: no ability to manage access

All are required to have a password matching at least some complexity.

Some warnings about security are done during the onboarding and they have a support section available on the platform even if not authenticated.

### Activity tracking

- Errors are forwarded to Sentry so we can debug and manage alerts _(anonymized input)_
- Our logs give an overview of what is happening _(anonymized input)_
- Matomo gathers analytics _(anonymized input)_
- Metabase can be used by the team to overview the platform activity _(relies on nominative data)_

### Application update policy

We chose to not use an automated tool to upgrade our dependencies because:

- Most of the time new versions are not about security, so automation is likely to bring breaking changes in our own application since it's known a few respects the `semver` naming when publishing a new version
- When it's about a security reason, it's in majority targeting a deep nested dependency and the indirect usage we have of it is far from the vulnerability

Instead we rely on CVE notifications from GitHub and we decide if it is a trigger. And we also keep looking at notifications from our organization since a lot of projects share the same stack.

### Integrity

Scalingo enables automatic backups and its own security guards.

We plan in the future to duplicate those backups onto another provider in a different location to be sure having our Scalingo access compromised will not be a dead-end.

### Privacy

Please refer to our privacy policy to know more about this.
