#!/usr/bin/env bash

# Installer for OSEHRA VistA + Node.js on Ubuntu Machines - part 2: EWD installation
#
# Run using: source installEWD.sh
#

nvm install 0.10.25

# Now install EWD.js and Nodem:

  mkdir node
  cd node
  npm install ewdgateway2
  npm install nodem

# Now move the contents of ewdgateway2 into the correct places:

  mv ~/node/node_modules/ewdgateway2/ewdLite/node_modules/*.js ~/node/node_modules/
  mv ~/node/node_modules/ewdgateway2/ewdLite/startupExamples/ewdStart-OSEHRA-VistA.js /home/ubuntu/node/
  mkdir ~/www
  mkdir ~/www/ewd
  mkdir ~/www/js
  mkdir ~/ssl
  mv ~/node/node_modules/ewdgateway2/ewdLite/www/ewd/* ~/www/ewd/
  mv ~/node/node_modules/ewdgateway2/ewdLite/www/ewdLite ~/www/
  mv ~/node/node_modules/ewdgateway2/ewdLite/www/js/* ~/www/js/
  mv ~/node/node_modules/ewdgateway2/ewdLite/ssl/* ~/ssl/


# Next, get NodeM configured correctly:

  cp ~/node/node_modules/nodem/lib/mumps10.node_x8664 ~/mumps.node
  export GTMCI=~/node/node_modules/nodem/resources/calltab.ci
  export gtmroutines="/home/ubuntu/node/node_modules/nodem/src ${gtmroutines}"
  cd /usr/local/lib
  sudo ln -s /opt/lsb-gtm/V6.0-002_x86_64/libgtmshr.so
  sudo ldconfig
  cd ~
  rm -rf /tmp/VistA


echo 'EWD.js has now been installed and is ready to run!'
echo 'To start EWD.js:'
echo 'cd ~/node'
echo 'node ewdStart-OSEHRA-VistA'


