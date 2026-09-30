# da eseguire nella cartella ~/repo_git/termostato_fe/
echo 'Start...'
npm ci
npm run generate:api
npm run build
rm dist.tar
tar -cf dist.tar dist/
# scp dist.tar  er@192.168.1.25:/home/er/ai_projects/

echo 'Finish!'
echo 'Lancia il secuente comando:'
echo 'scp dist.tar  er@192.168.1.25:/home/er/ai_projects/'
