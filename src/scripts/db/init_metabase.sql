-- This is just to create the schema and the user in the existing PostgreSQL database

-- By default the application has used the `public` schema by mistake, creating any new user gives him all priviliges on `public` schema
-- so we make sure this is no longer applying to isolate Metabase runtime access from our own application data
-- TODO: in the future, rename the public schema that is no longer "public" and adjust Prisma client for using the renamed schema, and use a distinct user for this schema (keeping the default as a "superuser")

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE <database_XXX> FROM PUBLIC;
REVOKE USAGE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC; -- Adding this one just in case since having a doubt what worked really

-- [IMPORTANT] Before executing those requests, replace `metabase_XXX` by a non-guessable username that should never be committed :)

--
--  With Scalingo the user has to be created from their dashboard
--

-- -- Replace the password
-- -- python2 -c 'import random,string; print("".join(random.choice(string.ascii_lowercase + string.ascii_uppercase + string.digits) for i in range(64)))'
-- CREATE USER metabase_XXX WITH PASSWORD <password_XXX>;

CREATE SCHEMA metabase;

GRANT CREATE ON SCHEMA metabase TO <metabase_XXX>;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA metabase TO <metabase_XXX>;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA metabase TO <metabase_XXX>;
