#!/usr/bin/env bash

# Installer for OSEHRA VistA, GT.M, EWD.js + Node.js on Ubuntu Machines

sudo apt-get install -y git
git clone https://github.com/OSEHRA/VistA.git
cd VistA/Scripts/Install/Ubuntu
sudo ./autoInstaller.sh -e


cd ~
sudo apt-get install sshpass

# On EC2 machines:
# Edit /etc/ssh/sshd_config and set PasswordAuthentication to yes.
# sudo reload ssh


sudo su - osehra
cd node
npm install ewdvistaterm

cd ~/www
mkdir ewdVistATerm
cp -r ~/node/node_modules/ewdvistaterm/terminal/* ~/www/ewdVistATerm/
cp ~/node/node_modules/ewdgateway2/ewdLite/OSEHRA/VistATerm.js ~/node/VistATerm.js

# Start the terminal back-end interface module
cd ~/node
node VistATerm

