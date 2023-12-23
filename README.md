# Crunchyroll App for LG Smart TVs

*Crunchyroll&trade; is a registered trademark of the Sony Pictures Entertainment Inc.\
This project is not affiliated with Crunchyroll, Team Crunchyroll, or the Sony Pictures Entertainment Inc.*


## About

This is an unofficial app for LG smart TVs that allows you to watch Crunchyroll,\
a popular anime streaming service.


## Warning

This project is not affiliated with or endorsed by Crunchyroll. The use of this project may violate 
the terms of service between you and stream provider. Use with caution and at your own risk.


## Disclaimer

This software is intended for personal use only. Do not use it for illegal purposes, such as downloading 
copyrighted content without permission. We do not condone or support piracy, and any misuse of this 
software is not the responsibility of the project contributors or maintainers.


## How to run on local? (Linux)

1) Install git, node and npm. I use node version v14.20.0 and npm version 6.14.17 (google it), example:

```bash
sudo apt install git
sudo apt install nodejs
sudo apt install npm
```

2) Install enact client (version 5.1.3):

```bash
npm install -g @enact/cli
```

3) Create a new folder or go to where you want to download source code, example:

```bash
mkdir ~/webos-crunchy-test
cd ~/webos-crunchy-test
```

4) Download necessary source code from github, example:

```bash
git clone https://github.com/ediaz23/crunchyroll-webos-stream --recursive --single-branch --branch=master --depth 3
git clone https://github.com/ediaz23/crunchyroll-webos-service --single-branch --branch=master --depth 3
git clone https://github.com/ediaz23/crunchyroll-webos-server --single-branch --branch=master --depth 3
```

5) Run npm install for each project.

```bash
cd crunchyroll-webos-stream && npm install && cd ..
cd crunchyroll-webos-service && npm install && cd ..
cd crunchyroll-webos-server && npm install && cd ..
```

6) In one terminal run server:

```bash
cd crunchyroll-webos-server && npm run play
```

7) In other terminal run front-end:

```bash
cd ~/webos-crunchy-test/crunchyroll-webos-stream && npm run serve
```

8) Should run in any browser disabling cors, but my setup is chromium_81.0.4044.92_1.vaapi_linux.tar
  with next command:

```bash
~/webOS_TV_SDK/chrome-linux/chrome \
  --user-data-dir=$HOME/webOS_TV_SDK/chrome-linux/tmp_chrome \
  --disable-site-isolation-trials \
  --allow-file-access-from-files \
  --disable-web-security \
  --enable-remote-extensions \
  --enable-blink-features=ShadowDOMV0,CustomElementsV0
```

9) You can load mock data editing src/const.js


## How to create local package? (Linux)

6) Follow previously 5 steps and run build-dev for development or build-p for production,
  and app will be created in ~/webos-crunchy-test/crunchyroll-webos-stream/bin:

```bash
cd ~/webos-crunchy-test/crunchyroll-webos-stream && npm run build-dev
```


## Help

Control back event.

```
window.dispatchEvent(new KeyboardEvent('keydown', { 'keyCode': 461 }))
```


## ⚖ License

This project is released under [Apache 2.0 License](LICENSE)
