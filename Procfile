web: ./start-and-wait-to-init.sh
# We use `npx` to avoid using `npm run db:migration:deploy:unsecure`
# like that we can throw away all the dependencies at once without complicating things by reinstalling prisma
# [IMPORTANT] Update the version here if it has changed into the `package.json`
postdeploy: npx prisma@5.19.1 migrate deploy
