-- This is just to create a read-only user on data meaningful only

-- [IMPORTANT] Before executing those requests, replace `metabase_connector_XXX` by a non-guessable username that should never be committed :)

--
--  With Scalingo the user has to be created from their dashboard
--

-- -- Replace the password
-- -- python2 -c 'import random,string; print("".join(random.choice(string.ascii_lowercase + string.ascii_uppercase + string.digits) for i in range(64)))'
-- CREATE USER <metabase_connector_XXX> WITH PASSWORD <password_XXX>;

-- By default it has access to all the `public` schema since that's the default schema, so resetting everything
REVOKE ALL PRIVILEGES ON DATABASE <database_XXX> FROM <metabase_connector_XXX>;
REVOKE ALL ON SCHEMA public FROM <metabase_connector_XXX>;

-- Gives access to the public schema
GRANT USAGE ON SCHEMA public TO <metabase_connector_XXX>;

-- Since all tables are accessible by default, reset this
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM <metabase_connector_XXX>;

-- Now whitelist only what is needed, in a read-only mode
GRANT SELECT ON public."Address" TO <metabase_connector_XXX>;
GRANT SELECT ON public."Collaborator" TO <metabase_connector_XXX>;
GRANT SELECT ON public."Event" TO <metabase_connector_XXX>;
GRANT SELECT ON public."EventSerie" TO <metabase_connector_XXX>;
GRANT SELECT ON public."EventSerieDeclaration" TO <metabase_connector_XXX>;
GRANT SELECT ON public."Organization" TO <metabase_connector_XXX>;
GRANT SELECT ON public."TicketingSystem" TO <metabase_connector_XXX>;
GRANT SELECT ON public."User" TO <metabase_connector_XXX>;

--
-- TODO:
-- TODO: prevent access to ticketing system data...
-- TODO:
-- TODO:
-- TODO: for now the restriction is on the Metabase level, but it does not restrict on SQL direct request from Metabase
-- TODO:
--

-- TODO: ideally we would restrict to specific columns but it's not possible as of now...
-- maybe use specific views for tables that should be included partially
GRANT SELECT ("postalCode") ON public."Address" TO <metabase_connector_XXX>;
GRANT SELECT ("userId", "organizationId") ON public."Collaborator" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "eventSerieId", "startAt", "endAt", "audienceOverride") ON public."Event" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "ticketingSystemId", "name", "performanceType", "expectedDeclarationTypes", "audience") ON public."EventSerie" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "eventSerieId", "type", "status", "lastTransmissionErrorAt") ON public."EventSerieDeclaration" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "name") ON public."Organization" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "name", "lastSynchronizationAt", "lastProcessingErrorAt") ON public."TicketingSystem" TO <metabase_connector_XXX>;
GRANT SELECT ("id", "firstname", "lastname", "email", "status", "lastActivityAt") ON public."User" TO <metabase_connector_XXX>;
