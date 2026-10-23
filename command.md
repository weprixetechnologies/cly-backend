cd ../cly-backend-prod
git pull
npm i 
pm2 restart cly-backend

cd ../cly-user-next
git pull
npm i
npm run build
pm2 restart cly-user

cd ../cly-admin-next
git pull
npm i
npm run build
pm2 restart cly-admin