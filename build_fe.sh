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
echo '   -> lele@lelex:$ ssh er@192.168.1.25'
echo '   --> er@raspberrypi:$ cd ai_projects/'
echo '   --> er@raspberrypi:$ sudo sh deploy_fe.sh'
echo 'scp dist.tar  er@192.168.1.17:/home/er/termostato_fe/'
echo '   -> lele@lelex:$ ssh er@192.168.1.17'
echo '   --> er@raspberrypi:$ cd termostato_fe/'
echo '   --> er@raspberrypi:$ sudo sh deploy_fe.sh'
