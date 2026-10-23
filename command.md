cd ../cly-backend-prod

git pull
npm i 
node run_category_slug_migration.js
pm2 restart cly-backend

cd ../cly-user-prod
git pull
npm i
npm run build
pm2 restart cly-user

cd ../cly-admin-prod
git pull
npm i
npm run build
pm2 restart cly-admin

