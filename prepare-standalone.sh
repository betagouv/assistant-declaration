mkdir -p ./dist
cp -R ./.next/standalone/* ./dist/
cp -R ./.next/standalone/.next ./dist/ # needed since the wildcard above does not copy hidden directories
cp -R ./.next/static ./dist/.next/
cp -R ./public ./dist/
