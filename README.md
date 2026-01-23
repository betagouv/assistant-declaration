# Assistant déclaration

A french national platform helping live performance entrepreneurs leverage their ticketing software to pre-fill administrative declarations.

- The project is available at: https://assistant-declaration.beta.gouv.fr _(#production)_
- The "test environment" with meaningless data is on: https://assistant-declaration.incubateur.net _(#development)_

All the states of the application are described visually on a Storybook. It renders fake data but allows you to discover the project without dealing with real flows: https://main--674df2a3f4d9c5810580efa2.chromatic.com/

## Usage

Run:

```sh
npm install
npm run setup
```

Then you can have a look at the `package.json` file to see common available commands.

For example to start developing and interact with the frontend, launch the application and the Storybook with:

```sh
npm run dev
```

If you want to only launch one of the two:

- Application: `npm run dev:app`
- Storybook: `npm run dev:storybook`

**Note the application needs some tools to run locally:**

- the database
- a mail catcher to prevent using a real SMTP

Note for long-running tools the easiest way to use them is to use `docker-compose`. In another terminal just set up all tools:

```sh
docker-compose up
```

And when calling it a day you can stop those containers with:

```sh
docker-compose down
```

Now the database schema and client need to be initialized:
`npm run db:migration:deploy && npm run db:schema:compile`

The application has extra logic not accessible through the UI, we may have to use the CLI to perform some actions:
`npm run cli`

That's it! But still, we advise you to read the documentation below to better understand how the project is structured.

### Requirements for SACD declaration

For the SACD we have to target the right agency to transmit the declaration attachments. There is a matching between postal codes prefixes and their bound agency.

This document is considered private for now so we cannot script the whole process. Here the manual steps:

1. Get from the SACD the mapping file (should contain columns `Département`, `mail`)
2. Since they usually give a XLSX, just save it as CSV with comma as delimiter (can be done with LibreOffice)
3. Move the file under `./data/sacd-agencies.csv`
4. Synchronize data into the database depending on the environment:
   - If `local` you can simply run: `npm run cli sacd agency sync`
   - If `development` or `production`, first export the database environment variable `DATABASE_URL` and then run: `npm run cli:unsecure sacd agency sync`
5. Check within the database the table has been filled correctly

The synchronization is working making a difference of both states, so if SACD is updating its file, juste update the CSV and rerun the synchronization. It will work properly.

### Requirements for SACEM declaration

For the SACEM we have to target the right agency to transmit the declaration. There is a huge matching between postal codes and their bound agency.

This document is considered private for now so we cannot script the whole process. Here the manual steps:

1. Get from the SACEM the mapping file (should contain columns `LOCAL`, `CP`, `Mail`)
2. Since they usually give a XLSX, just save it as CSV with comma as delimiter (can be done with LibreOffice)
3. Move the file under `./data/sacem-agencies.csv`
4. Synchronize data into the database depending on the environment:
   - If `local` you can simply run: `npm run cli sacem agency sync`
   - If `development` or `production`, first export the database environment variable `DATABASE_URL` and then run: `npm run cli:unsecure sacem agency sync`
5. Check within the database the table has been filled correctly

The synchronization is working making a difference of both states, so if SACEM is updating its file, juste update the CSV and rerun the synchronization. It will work properly.

## Technical setup

### OVH Cloud

This helps for DNS delegation (to configure domains, emails...). Configuration steps will be specified below for each service that needs specific DNS records.

### GitHub

#### Environments

You must configure 3 environments in the CI/CD settings:

- `global` (to restrict to `dev` and `main` branches only)
- `dev` (to restrict to `dev` branch only)
- `prod` (to restrict to `main` branch only)

#### Secrets

The following ones must be repository secrets (not environment ones):

- `CHROMATIC_PROJECT_TOKEN`: [SECRET]
- `SENTRY_URL`: [SECRET] _(format `https://xxx.yyy.zzz/`)_
- `SENTRY_AUTH_TOKEN`: [SECRET]
- `SENTRY_ORG`: [SECRET]
- `SENTRY_PROJECT`: [SECRET]

#### Default branch

The default branch is `dev`.

#### Branch protection rules

1.  - Pattern: `main`
    - Checked:
      - Require status checks to pass before merging
      - Do not allow bypassing the above settings
      - Allow force pushes (+ "Specify who can force push" and leave for administrators) _(we allow this as the product is still experimental without a development environment)_

2.  - Pattern: `dev`
    - Checked:
      - Require linear history
      - Do not allow bypassing the above settings
      - Allow force pushes (+ "Specify who can force push" and leave for administrators)

### Sentry

#### Helpful to monitor

We use Sentry to monitor errors that happen on frontend and backend. It has been added everywhere it was needed to catch unexpected errors no matter the tool used (Next.js, `pg-boss`...).

To keep safe sensitive information we prevent sensitive elements from being recorded by `rrweb` (useful to replay the session up to the issue).

_Note: `BusinessError` errors are not tracked because they are intented to describe a possible error in the user flow (validation error, entity deleted by someone and no longer existing...)_

Since Sentry gets only error details from the built application, we provide source maps during the CI/CD so debugging is easier by seeing original source code. For this we set `SENTRY_RELEASE_UPLOAD = true` into the `ci.yaml` file.

#### Upload sourcemaps

To upload sourcemaps to Sentry you need a specific "auth token", it must have these scopes:

- `project:releases`
- `org:read`

You can create this token at https://${SENTRY_URL}/settings/account/api/auth-tokens/ ;)

#### Silent odd errors

Since the application watches all kinds of errors, it happens we collect some that are not reproductible and without any impact for the user experience.

To avoid being notified of those we chose to silent them from the Sentry interface. Just go to your Sentry project interface, then `Processing > Inbound Filters > Custom Filters > Error Message` and enter the silent patterns, for example:

```
*ResizeObserver loop completed with undelivered notifications*
```

### Scalingo

#### Global

We enabled the Postgres addon and the "review apps" feature.

#### Domains

For each environment you need to configure the domain DNS records to target the Scalingo instance when accessing the domain. Since we have per domain a dedicated DNS zone, we cannot use a `CNAME`. We have to use fixed IPs:

- Type: `A`
- Hostname: ``
- Value: `xxx.xxx.xxx.xxx` _(depending on the environment)_

_(you can find those IPs at https://doc.scalingo.com/platform/app/domain#configure-your-domain-name . There is a low risk they change so we should be fine... another dynamic solution would have been to use an `ALIAS` record if the DNS provider is compatible but it disables the `DNSSEC` and we are not confident yet of the real underlying risks so we stick we `A` records for now)_

Once done, go to your Scalingo domains settings and add your domains for each environment. If for an environment you want to accept both `example.com` and `www.example.com`, make sure to promote within Scalingo `www.example.com` as canonical. It means other domains will redirect (HTTP 301) to the canonical one (just be sure of your choice, 301 is cached on the users browser so it cannot be reverted easily after some time... and Scalingo does not provide a 302 redirection for now).

There is also an option to "force HTTPS" inside `Settings > Routing`, please use it.

#### Postgres

##### Extensions

Just enable with the SQL query `CREATE extension ${EXTENSION};` the following extensions needed by some of our libraries (on all environments):

- `uuid-ossp`
- `pgcrypto`

##### Tooling

We advise you to use DBeaver (RDBMS-agnostic) as a software to supervize and monitor you application.

#### Environment variables

Scalingo is used as a PaaS to host our builds.

For each build and runtime (since they are shared), you should have set some environment variables.

##### For the "main" app

- `APP_MODE`: `prod` or `dev` _(depending on the instance you deploy)_
- `NEXT_PUBLIC_APP_MODE`: `prod` or `dev` _(depending on the instance you deploy)_
- `GITHUB_TOKEN`: [SECRET] \_(limited GitHub fine-grained personal access tokens scoped to this repository, see the `Scalingo` section)
- `SCALINGO_POSTGRESQL_URL`: [GENERATED] _(you must add as query parameter `sslmode=prefer`. Also, in the development environment since using limited database resources (maximum 10 connections) we want the current runtime, potentially the one being deployed, plus maybe a local database connection to debug, to all be supported (1 runtime has 2 clients due to Prisma and PgBoss), so we chose to set in development the query parameter `connection_limit=1`)_
- `DATABASE_URL`: `$SCALINGO_POSTGRESQL_URL` _(filled by Scalingo automatically when adding a database)_
- `MAINTENANCE_API_KEY`: [SECRET] _(random string that can be generated with `openssl rand -base64 64`. Note this is needed to perform maintenance through dedicated API endpoints)_
- `FILE_AUTH_SECRET`: [SECRET] _(random string that can be generated with `openssl rand -base64 64`. Note this token is just for the short-lived read permission of private attachments)_
- `NEXT_AUTH_SECRET`: [SECRET] _(random string that can be generated with `openssl rand -base64 64`. Note that if this secret is lost, all users will have to log in again)_
- `NEXT_PUBLIC_APP_BASE_URL`: [TO_DEFINE] _(must be the root URL to access the application, format `https://xxx.yyy.zzz`)_
- `CRISP_SIGNING_SECRET_KEY`: [SECRET] _(this secret is generated from your Crisp account and depends on the development or production environment)_
- `NEXT_PUBLIC_MATOMO_URL`: [PROVIDED] _(format `https://xxx.yyy.zzz/`)_
- `NEXT_PUBLIC_MATOMO_SITE_ID`: [GENERATED] _(number format)_
- `NEXT_PUBLIC_CRISP_WEBSITE_ID`: [TO_DEFINE] _(this ID is defined in your Crisp account and depends on the development or production environment)_
- `NEXT_PUBLIC_SENTRY_DSN`: [SECRET] _(format `https://xxx.yyy.zzz/nn`)_
- `MAILER_DEFAULT_DOMAIN`: [TO_DEFINE] _(format `xxx.yyy.zzz` depending on the environment application URL)_
- `MAILER_DOMAINS_TO_CATCH`: `domain.demo,sacem.fr,sacd.fr` _(this should only be set in the development environment, comma separated domains)_
- `MAILER_SMTP_HOST`: [SECRET]
- `MAILER_SMTP_PORT`: [SECRET]
- `MAILER_SMTP_USER`: [SECRET]
- `MAILER_SMTP_PASSWORD`: [SECRET]
- `MAILER_FALLBACK_SMTP_HOST`: [SECRET]
- `MAILER_FALLBACK_SMTP_PORT`: [SECRET]
- `MAILER_FALLBACK_SMTP_USER`: [SECRET]
- `MAILER_FALLBACK_SMTP_PASSWORD`: [SECRET]
- `SACD_API_BASE_URL`: [SECRET]
- `SACD_API_CONSUMER_KEY`: [SECRET]
- `SACD_API_SECRET_KEY`: [SECRET]
- `SACD_API_PROVIDER_NAME`: [SECRET]
- `SACD_API_PROVIDER_REFFILE`: [SECRET]
- `SACD_API_PROVIDER_PASSWORD`: [SECRET]
- `METABASE_SITE_URL`: [PROVIDED] _(only in production, format `https://xxx.yyy.zzz`)_
- `METABASE_SECRET_KEY`: [SECRET] _(only in production, comes from the Metabase interface when allowing static embeds)_
- `METABASE_IMPACT_DASHBOARD_ID`: [SECRET] _(only in production, comes from the main dashboard inside Metabase)_
- `DISABLE_TICKETING_SYSTEM_MOCK_FOR_USER_IDS`: [TO_DEFINE] _(environments that are not production will by default mock remote ticketing system calls. For testing purpose you can provide a comma separated UUID list of users who need to perform real tests)_

#### Review apps

Those are temporary environments, different than `dev` and `prod`. Since they have their own random generated IDs, we use the `scalingo.json` file to:

- adjust environment variables
- seed the database to have some data to test on

### GitHub access

During the build we get some repository information from GitHub to enhance Sentry metadata. It went well for some time but randomly we got the error:
`API rate limit exceeded for ${IP} (...) But here's the good news: Authenticated requests get a higher rate limit.`

By default the `@octokit/rest` client will fetch data while not being authenticated so we share the quota with others, which may fail. We decided to create a fine-grained personal access token scoped to the current repository with only the scope `Read-Only` on `Contents` to be used as `GITHUB_TOKEN` in Scalingo. The only drawback is we need to specify an expiration with 1 year as maximum (we hope they will change it in the future to allow "no expiration" as for classic tokens).

_Note that the other way is to create a GitHub App, connect it to the repository, manage the token... which is way more complicated! Even with the current 1 year expiration we are fine since builds are done only if people is working on the project :)_

#### Monitoring

It's important to be aware of some events, for this we decided to monitor:

- Scalingo (responsible for the application and database)
- Sentry (responsible for gathering runtime issues)

_Note that doing it after the full setup will avoid flooding your inbox :)_

**IMPORTANT: keep in mind webhook URL tokens can be invalidated if someone leaves the project while he created them.**

##### Scalingo

For both the development and production environments you need to create notifiers by following the following steps.

First, create a Slack notifier named `tech` to keep an eye on the global activity, specify the webhook URL to use and enable those events:

- `addon_db_upgraded`
- `addon_deleted`
- `addon_plan_changed`
- `addon_provisioned`
- `addon_resumed`
- `addon_suspended`
- `alert_added`
- `alert_deleted`
- `app_alert_triggered`
- `app_command_ran`
- `app_crashed`
- `app_crashed_repeated`
- `app_deleted`
- `app_deployed` _(ideally only in `production` but finally to both, otherwise we are not notified of deployment failure (they should have a dedicated event for this...))_
- `app_edited`
- `app_region_migration_started`
- `app_renamed`
- `app_restarted`
- `app_scaled`
- `app_stopped`
- `app_transferred`
- `collaborator_accepted`
- `collaborator_invited`
- `collaborator_removed`
- `domain_added`
- `domain_edited`
- `domain_removed`
- `github_link`
- `github_unlink`
- `notifier_added`
- `notifier_edited`
- `notifier_removed`
- `variable_added`
- `variable_bulk_edited`
- `variable_edited`
- `variable_removed`

And in some cases you don't want to miss the notification, because it's a runtime failure, a sensitive setting that changed... For this create an email notifier named `tech-important` and add appropriate people to be notified. Enable those events:

- `addon_deleted`
- `addon_suspended`
- `app_alert_triggered`
- `app_crashed`
- `app_crashed_repeated`
- `app_deleted`
- `app_region_migration_started`
- `app_renamed`
- `app_transferred`
- `collaborator_accepted`
- `collaborator_invited`
- `collaborator_removed`
- `domain_added`
- `domain_edited`
- `domain_removed`
- `github_link`
- `github_unlink`
- `notifier_edited` _(only in `production`)_
- `notifier_removed` _(only in `production`)_
- `variable_bulk_edited` _(only in `production`)_
- `variable_edited` _(only in `production`)_
- `variable_removed` _(only in `production`)_

_Find more context on those events on https://doc.scalingo.com/platform/app/notification_

#### Debug the runtime

To debug scalingo apps you may prefer using their CLI with some commands like:

```sh
scalingo login --api-token ${SCALINGO_API_TOKEN}
scalingo -a ${SCALINGO_APP_NAME} addons
scalingo -a ${SCALINGO_APP_NAME} logs
scalingo -a ${SCALINGO_APP_NAME} logs --addon ${SCALING_ADDON_ID}
scalingo -a ${SCALINGO_APP_NAME} run bash
scalingo -a ${SCALINGO_APP_NAME} pgsql-console
scalingo -a ${SCALINGO_APP_NAME} db-tunnel ${SCALINGO_DATABASE_URL}
```

Note that:

- `pgsql-console` command will logs you onto the database but it's shell only (it uses the default Scalingo user)
- `db-tunnel` command sets up a SSH tunnel first, so you need to configure your public SSH key in your Scalingo account settings, but then you will be able to use local software to navigate through the database, or even migrating the schema with custom scripts. Also note `${SCALINGO_DATABASE_URL}` can be either replaced by the database URL content directly, or by an environment variable to get the content from (using the format `MY_ENV_VAR_FOR_DATABASE_URL`)

To debug a remote database we advise creating a specific user (because you are not suppose to store credentials of super users). Make sure the user created has been granted needed roles on business tables (through the `psql-console` command), something like `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA $SCHEMA TO $USERNAME;` that you can customize as needed ;) . (If you still see no table that's probably because you logged into the wrong database)

#### Debug the CI/CD pipeline

Scalingo uses the Heroku technology of buildpacks to embed your application at runtime and it's quite complicated to replicate the logic locally. It does not bring the flexibility of a custom Docker image, nor the new "standard" tool to manage buildpacks (https://buildpacks.io/).

In case you have an edge pipeline error, it may help to try using `herokuish` for mimicing the build embedding your application in the wanted buildpack. It's not a miror of the Scalingo pipeline but it can help. The easier thing we found for now is to use a custom Dockerfile:

```dockerfile
FROM gliderlabs/herokuish:latest

COPY . /app

ENV BUILD_APP_NAME=main
```

On the other side if you are looking for investigating a built image, Scalingo provides a paid addon to access the registry of images that passed their pipeline with success (those are Docker images). It helped us in the past to optimize excessive size of remaining dependencies for example.

### Emails

#### Outgoing

We use 2 providers to send emails:

- the main one (Scaleway)
- the fallback one (Brevo) in case the main one is not reachable it keeps our delivery reactive

Sending verified emails must be taken seriously so they don't end into the spam inbox. Keeping a good reputation by sending necessary content so users don't flag you as spam.

Also you need to configure your DNS records to handle from both providers on the 2 environments (development and production): DMARC/DKIM/SPF. It's well explained when adding sending domains on their interface. It will make your emails signed according to your domain.

When creating SMTP credentials make sure sure to use different ones between the development and the production environment.

_Note: don't forget to enable the transactional emailing feature on Brevo by contacting the support, it will save you for the run :p_

### Matomo

We use the minimal tracking configuration allowing the frontend to not request the user consent. Our goal is just to track pageviews, or usage of specific features of the application.

On the Matomo instance you have access to, just create a new website to get a new site ID.

### Metabase

We use it as our business intelligence software for dashboards to measure impact. As of now it's not 100% anonymized as for Matomo because it also helps the team as an internal backoffice to understand what is happening, when and by who.

Due to this, we do not use a shared Metabase instance, so it requires a distinct runtime instance on Scalingo (but we reuse the main database, with a different PostgreSQL schema).

_Also note there is only an instance for production, no need of testing it on development environment._

For the setup, follow:

1. First of all prepare the current production database to colocate Metabase data in its own isolated schema:
   1. Follow instructions within `./src/scripts/db/init_metabase.sql`
   2. Some of the values you used will be needed to fill the `MB_DB_CONNECTION_URI` environment variable (another step below)
2. Fork https://github.com/Scalingo/metabase-scalingo to be in the same GitHub organization than your repositories
3. Within Scalingo:

   1. Create a new application suffixed with `-metabase`
   2. Make it accessible on `data.assistant-declaration.beta.gouv.fr` by configuring both Scalingo as a canonical domain, and the DNS zone with the `CNAME` Scalingo value
   3. Force HTTPS in the routing settings
   4. Make it targets the forked GitHub repository to auto-deploy on updates (when synchronizing the fork...)
   5. Reuse the main application notifier settings for production to be notified by Slack and email
   6. Set the environments variables:
      - `MB_SITE_URL`: [PROVIDED] _(format `https://xxx.yyy.zzz/`)_
      - `MB_SITE_LOCALE`: `fr`
      - `MB_DB_TYPE`: `postgres`
      - `MB_DB_CONNECTION_URI`: [SECRET] _(format `jdbc:postgresql://$host:$port/$database?currentSchema=metabase=user=$user&password=$password`, note the `metabase` schema used here)_
      - `MB_ENCRYPTION_SECRET_KEY`: [SECRET] _(random string that can be generated with `openssl rand -base64 64`. Note this is needed otherwise sensitive values in database won't be encrypted)_
      - `MB_PASSWORD_COMPLEXITY`: `strong`
      - `MB_PASSWORD_LENGTH`: `16`
      - `MB_SESSION_TIMEOUT`: `{"amount":120,"unit":"minutes"}` _(without this the session would last forever)_
      - `MB_APPLICATION_DB_MAX_CONNECTION_POOL_SIZE`: `5` _(Metabase can be really consumming in term of database connections for the instance, since available ones are limited on Scalingo we cap this)_
      - `MB_JDBC_DATA_WAREHOUSE_MAX_CONNECTION_POOL_SIZE`: `5` _(Metabase can be really consumming in term of database connections for connectors, since available ones are limited on Scalingo we cap this)_
   7. Start a manual deploy from the `master` branch
   8. Now containers are listed, you may ask for the type `M - 512MB of RAM`, no need of more

4. If the start is failing on migrating things into the `public` schema, it may be due to Metabase for the initial setup unable to use the custom `?currentSchema` (have a look at https://github.com/metabase/metabase/issues/37836#issuecomment-3474538472 for explanations and solution)
5. Go to https://data.assistant-declaration.beta.gouv.fr/ for the first initialization of the service:

   1. Use hard secret
   2. Skip database source configuration
   3. Disable metrics going to the Metabase company
   4. Validate the onboarding
   5. Then within the dashboard go to admin settings:
      - Make sure the domain is correctly set to:
        - `https://`
        - `data.assistant-declaration.beta.gouv.fr`
      - Enable HTTPS redirection
   6. Ideally Metabase should manage 2FA for users but it's not, in the meantime be aware of that like for emails used (ref: https://github.com/metabase/metabase/issues/3729). _Maybe ProConnect as SSO could be used to fill this purpose partially._

6. We need to also create a database user accessing our application tables but excluding sensitive tables or columns, for this follow instructions within `./src/scripts/db/init_metabase_connector.sql`
7. Then configure the connector to our application tables

   1. Go to database menu in the data section
   2. Add a database a database as connector
   3. Fill all information with the "connector user", specify the schema, and enable SSL connection in the `prefer` mode. Note you can use the `Connection string` to prefill all others, but we learnt the hard way it sets wrongly the field `Additional options for JBDC` within `Advanced configuration`. **So make sure to empty this field!** In our case it was setting all URL parameters as `currentSchema=xxx;user=yyy;password=zzz` resulting in `=xxx;user=yyy;password=zzz` being the current schema within the additional option. So it was messing to cast variables to Postgres ENUMs despite existing... Saw that by using `SELECT search_path;`\_
   4. Create a few Metabase questions and a sample dashboard to make sure everything is working

Some notes aside:

- Any new user has access to connected databases (make sure to use groups for permissions if needed)
- Metabase allows notifying by emails or Slack of any interesting change in a metric

### Crisp

Crisp is used as a livechat for user support.

From their interface we create 2 websites:

- Production: use the production domain
- Development: use the development domain

Set the name:

- Production: `Assistant déclaration`
- Development: `Assistant déclaration [DEV]`

Then upload as the icon the one used for the website (usually `apple-touch-icon.png` has enough quality).

Add to the team the people you need (without giving too many rights depending on their role).

Into the `Chatbox & Email settings` section go to `Chat Appearance` and set:

- Color theme (chatbot color): `Indigo`
- Chatbox background (message texture): `Default (No background)`

Then go to `Chatbox Security` and enable `Lock the chatbox to website domain (and subdomains)` (no need to enable it inside the development environment).

And inside `Advanced configuration`, enable `Verify user emails with cryptographic signatures`. This will help making sure someone named "John Doe" engaging the conversation in the livechat is really our agent "John Doe" of the platform and not someone trying to impersonate his identity. Since Crisp messaging is initialized from the frontend, without the cryptographic trick it would be impossible to certify a user asking for sensitive operation is the expected one.

It will give you a secret you that you need to serve to your backend as `CRISP_SIGNING_SECRET_KEY` (it should not be available on the frontend side contrarily to the website ID). _(for now, we only use it in production since it requires ugprading the Crisp plan)_

On the other site, the public "website ID" will be used as `NEXT_PUBLIC_CRISP_WEBSITE_ID`.

### Maintenance

Since everything stateful is inside the PostgreSQL you should be able to do most of the maintenance from `DBeaver`.

#### Retrieve old data from backups

Just download the database backup from the Clever Cloud interface and run it locally with Docker with no volume (to be sure not keeping sensitive data locally):

- Terminal 1:

```sh
docker run -it --rm -p 15432:5432 --name tmp_postgres -e POSTGRES_PASSWORD=postgres -v $(pwd)/${BACKUP_FILENAME}.pgsql:/backup.pgsql postgres
```

- Terminal 2:

```sh
docker exec -it tmp_postgres bash
pg_restore -U postgres -d postgres --no-owner -v /backup.pgsql
psql -U postgres -d postgres
```

_Note: sometimes `pg_restore` will fail creating the `public` schema despite having the command to. Create it manually through DBeaver within the database and rerun the `pg_restore` command to make it successful._

Then debug from SQL inline or use DBeaver to connect to `localhost:15432` with above credentials.

Once done, stop the container and remove the downloaded `.tar.gz / .psql` files.

#### Replay jobs

Except the case of replaying queueing jobs once they fail because they may be archived already. And since it's a bit tricky to move a job directly from SQL while cleaning its right properties, we decided to make an endpoint for this as an helper:

- [POST] `/api/maintenance/jobs/replay` _(it expects as body `{ topicName: "...", jobId: "..." }`)_

**Note that to reach maintenance endpoints you have to pass a header `X-API-KEY` that must match the server environment variable `MAINTENANCE_API_KEY`.**

### IDE

Since the most used IDE as of today is Visual Studio Code we decided to go with it. Using it as well will make you benefit from all the settings we set for this project.

#### Manual steps

Every settings should work directly when opening the project with `vscode`, except for TypeScript.

Even if your project uses a TypeScript program located inside your `node_modules`, the IDE generally uses its own. Which may imply differences since it's not the same version. We do recommend using the exact same, for this it's simple:

1. Open a project TypeScript file
2. Open the IDE command input
3. Type `TypeScript` and click on the item `TypeScript: Select TypeScript Version...`
4. Then select `Use Workspace Version`

In addition, using the workspace TypeScript will load `compilerOptions.plugins` specified in your `tsconfig.json` files, which is not the case otherwise. Those plugins will bring more confort while developing!

### Tips

#### Quick onboarding overview

There are 2 main goals of the current application:

1. From a unique declaration form, allow transmitting it to one or multiple organisms
2. Try to gather already digitized information from external services to prefill the declaration form (only from ticketing systems for now)

The core feature is the (1) and after some testing we ended using a unique form that have some fields required (because common to all organisms like event serie name, dates...), and some others optional depending on which organism you need to declare to. This declaration information is directly set both on the `event serie` and `event` entities, [you can discover the details in the database schema](./src/prisma/schema.prisma). Once fully filled the declarant can transmit the information to organism, resulting in some `declaration` according to how many were selected.

Declarants have the possibility in the platform to create manually their `event serie` and `event` to declare, but the idea was to rely on the (2) to help declarants saving time instead of copy-pasting event serie name, dates, ticketing data. For example among ticketing revenues to declare you may need to substract commission from each sold ticket, which may add over-calculation from a declarant point of view. But despite binding directly some ticketing systems has worked, we noticed they were all behaving differently:

- some not having the notion of `event serie` but only `event`
- some putting the VAT either on the ticket, on the category price, on the event or on the event serie
- some not exposing the commission amount to substract
- some not having an API to get this information
- ...

And since there is also no standard, our data models result in a compromise to be compatible with most those systems, ensuring this would also fit expected data from organisms.

_If any doubt about a property name since all technical stuff is in english, you may look at its french version [in the application translations file](./src/i18n/fr/common.json)._

#### Cron tasks

Doing tasks on a regular basis is a real subject, ask yourself:

- Is it critical if a task schedule is missed? (ideally it could be trigger manually if the support team notices that, so keep track of it)
- Is it critical if multiple app instances run the same task concurrently?
- Does the job needs to be restarted if it fails?

... doing only in-app scheduling would break the persistence and concurrency challenges. On the other side, using a third-party to trigger our tasks is risky too since you rely on it and on the network. Even in the last case you should use a central locker to be sure you don't run 2 times the job in case of a close network retry.

The conclusion, in all cases we need something out of the app and that can manage atomicity for concurrency. So we chose to adopt `pg-boss` that allows us to use our own PostgreSQL like a basic tasks queue, it brings persistence, locking, and task monitoring with states (scheduled, canceled, failed, archived)... this is great because in 1 place we now finally have all things to debug, same in case of backups we do have the "task log".

#### Frontend development

##### i18n

Currently we only use i18n to help displaying ENUM values. We use the `i18n Ally` VSCode extension to improve a bit the usage but everything can be written manually in `.json` files :)

##### Storybook

###### Use it first

Developing a UI component by launching the whole application is annoying because you may have to do specific interactions to end viewing the right state of the component you are building.

We advise when doing some UI to only run Storybook locally, so you do not worry about other stuff. You can also mock your API calls! At the end splitting your component into different stories makes easy for non-technical people of the team to view deepest details. They will be able to review the visual changes with Chromatic, and also from the Storybook they will save too their time avoiding complex interactions to see specific state of the application.

It's not magical, it does not replace unit and end-to-end testing, but it helps :)

###### Advantages

- Accessibility reports
- See almost all tests of your application
- Helps architecturing your components split
- Their rendering is tested in the CI/CD, so it's very likely your components are valid at runtime

###### How we test stories

You can do UI testing scoped to components (I mean, not full end-to-end), and if so, it's recommended to reuse the stories to benefit from their mocking set up.

A decision we took to keep in mind: it's common to create a `.test.js` file to test that a component renders correctly (thanks to Jest, Playwright or Cypress), but since we have "Storybook test runners" already in place that pop each component, we feel it's better to use the story `play` function concept (also used by the interaction addon) to make sure they are rendering correctly.

- It avoids rendering each component one more time
- It saves 1 file and it's clearer since from Storybook you can see in the "Interactions" tab if the expected behavior is matched

Those kind of tests may be useful to:

- Make sure for an atomic component the data is displayed correctly (but it's likely the work of your team to review visual changes)
- Guarantee the sequences when mocking (e.g. first a loader, then the form is displayed), it helps also the "Storybook test runners" to wait the right moment to take a screenshot/snapshot of the final state (through Chromatic in this case), not intermediate ones since the runner doesn't know when the component is fully loaded otherwise

_(in case you have specific needs of testing that should not pollute the Storybook stories, go with a `.test.js` file, see examples [here](https://storybook.js.org/docs/react/writing-tests/importing-stories-in-tests))_

_Tip: during the testing you could `findByText` but it's recommended to `findByRole`. It helps thinking and building for accessibility from scratch (because no, accessibility is not done/advised by an accessibility automated check unfortunately)._

###### Testing performance

During the test we render the story, we test the light theme accessibility and then we switch to the dark theme to test it too. The re-rendering for color change over the entire DOM is unpredictable, it depends on the CPU saturation. We had some leakage of previous theme rendered over the new one.

We evaluated 2 solutions:

- limit the number of Jest workers with `--maxWorkers`
- increase the amount of time we wait after triggering a theme change

After dozens of tests it appears the most reliable and the fastest is by keeping parallelism (no worker limitation), but increase the amount of time. But this latter depends on the environment:

- when testing headless: there is less work done, the delay is shorter
- when testing with a browser rendering: it is in higher demand, to avoid color style leakage we need to increase the delay (tests duration is +50%, which is fine)

##### Hydratation issue

When developing a frontend it's likely you will have client hydratation according to the server content. It will fail if some browser extensions are enabled and modify the DOM. You need to identify the source of the issue and then, either disable the extension, or request it to not modify the DOM when developing on `http://localhost:xxxx/`.

From our experience, this can be caused by:

- Password managers _(make sure to have no credentials that match your development URL)_
- Cookie banner automatic rejection _(in their settings you're likely to be able to exclude your development URL from being analyzed)_

_(in React the error was `Extra attributes from the server: xxxxx`)_

##### Cannot fetch specific files

As for any `hydratation issue` it worths taking a look at your browser extensions, some may block outgoing requests.

For example:

- Ad blockers _(whitelist the blocked URL in your extension)_

#### Backend developement

##### Adding a new ticketing system

Each remote ticketing system is implemented inside its own connector, respecting the interface of `TicketingSystemClient` to be sure we can have a generic logic in our controller to synchronize ticketing data. _Examples of current connectors can be found within `./src/core/ticketing/`._

All ticketing systems indeed manage entities like event, but the logic of event serie is not always present and their structure are really different across actors. The idea is to do your best to try matching the data we want, sometimes it will be in 1 request, sometimes you will have to iterate over all tickets to know the event total revenue for example.

#### Jest not working in VSCode

Sometimes it appears Jest VSCode extension will be stuck and will keep throwing:

```
env: node: No such file or directory
```

We found no fix. The only solution is to relaunch VSCode, and if it still doesn't work, try to close entirely VSCode and open it through your terminal with a something like:

```sh
code /Users/xxxxx/yyyyy/assistant-declaration
```

#### Formatting documents for compliance

Legal documents are mainly written out of technical scope in a basic text editor, and they may be updated quite often. Either you host them on a Markdown website or you embed them as HTML in your website. For both you have to maintain some transformations and you probably don't want to scan in detail for each modification, ideally you just want to redo all at once to be sure there will be no missing patch.

In this repository you can use `./format-legal-documents.sh` to transform the initial `.docx` files into `.html` files:

- No matter the name of the file it will convert it (though 1 per folder)
- It allows to collaborate on Word-like software (mainly used by legal people)

## Technical architecture document

It has been written into [TECHNICAL_ARCHITECTURE_DOCUMENT.md](./TECHNICAL_ARCHITECTURE_DOCUMENT.md).

## Reporting security issue

If you identify a security issue or have any security concerns, please inform us immediately by opening an [issue](https://github.com/betagouv/assistant-declaration/issues) as specified into [our security recommandations](https://assistant-declaration.beta.gouv.fr/.well-known/security.txt).
