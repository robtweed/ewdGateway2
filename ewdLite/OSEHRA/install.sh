#!/usr/bin/env bash

# Installer for OSEHRA VistA + Node.js on Ubuntu Machines

sudo apt-get install -y git
cd /tmp
git clone https://github.com/OSEHRA/VistA.git
sudo ln -s /tmp/VistA/Scripts/Install /vagrant
cd /vagrant/Ubuntu
sudo chmod 755 autoInstaller.sh
sudo ./autoInstaller.sh

# Install NVM

wget -qO- https://raw.github.com/creationix/nvm/master/install.sh | sh

# After this has run, log out and start new terminal session

echo 'NVM has been installed.  Log out and start a new terminal session and run installEWD.sh'
