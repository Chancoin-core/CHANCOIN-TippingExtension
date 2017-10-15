# CHANCOIN: Tipping Extension
A ChanCoin Chrome and Firefox browser extension for 4chan.
## General Information
This extension adds a tip button to 4chan posts with the following name format: `<PREFIX>:address` where `<PREFIX>` is one of:
* `$4chn`
* `4CHN`
* `$CHAN`
* `$chan`

If you want to receive tips through this extension, you MUST set your name on 4chan to this format. For example: `$4CHN:CbkMmgphehVHQo27tWEzNzLCbEKkwaBwwL`

As of version 0.0.5, the name field will automatically insert into the name field. This feature can be toggled off via the popup modal.
You can also select the address that you would like the extension to automatically insert or generate a new one. This requires the wallet to be setup and running.

![Popup Modal](https://i.imgur.com/KIqDDyM.png)

Once installed, correctly-formatted 4chan posts will have an additional "Tip poster" button in their dropdown box.

![Tip button](http://i.imgur.com/IekqP7H.png)

This extension is also compatible with the 4ChanX extension

![Tip button](http://i.imgur.com/M5K1PK0.png)

Clicking on this button will open a prompt that allows you to specify how much you would like to send.

## Installation

### Step 1
The first step is to run the ChanCoin wallet in server mode. This allows the extension to connect to it.

To do this, we'll create a configuration file in the wallet's data folder. This folder is located at `%appdata%/chancoin` on Windows and `/home/<username>/.chancoin` on Linux. You can [download](https://raw.githubusercontent.com/Michael4CHN/ChanCoin-for-4chan/master/chancoin.conf) the .conf file from the repository or copy and paste the following:


```
rpcuser=username
rpcpassword=password
rpcallowip=127.0.0.1
rpcport=43814
server=1
```

Save this file as `chancoin.conf`.

If the wallet is currently running, it will need to be restarted before the changes take effect.

### Step 2
The next step is to install the extension.

To do this, navigate to `chrome://extensions/` within chrome or `about:addons` in firefox.
Download the packed [Chrome Extension](https://github.com/VladimirPewtin/CHANCOIN-TippingExtension/releases/download/0.0.5/CHANCOIN_TippingExtension.crx)
or packed [FireFox Extension](https://github.com/VladimirPewtin/CHANCOIN-TippingExtension/releases/download/0.0.5/CHANCOIN_TippingExtension.xpi)
and drag the downloaded file into your browsers extensions / addon window. After accepting the permissions, the extension will be installed and ready to go.
___

If you like what I do, feel free to donate!

4CHN: `CbaNhNEnVBEx4CmCtDSatEhhwLp9WaCLjQ`

BTC: `1L4oM2DRtGseFLBLsUrgyMoM1oZv3FCbCz`

## Development

To set up your dev environment:

* `npm install -g gulp`
* `npm install`

To build the files:

* `gulp`
