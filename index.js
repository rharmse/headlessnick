'use strict';

const CHC = require('chrome-har-capturer');
const chalk = require('chalk');
const argv = require('minimist')(process.argv.slice(2));

const harContent = null;
const screenshot = null;
const host = 'localhost';
const port = 9222;
const viewportWidth = argv.viewportWidth || 1920;
const viewportHeight = argv.viewportHeight || 1080;
const content = null;
const timeout = 30000;
const parallel = argv.hydra || false;
const urls = [""];

const deviceMetrics = {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: false,
  fitWindow: false,
};

/*
* Create filesystem friendly name from uri.
*/
async function generateFilename(uri) {
  var url = uri||"screenshot";
  const schemaIndex = url.indexOf("://", 0);
  url = url.substr(schemaIndex > 0 ? schemaIndex+3:0, url.length);
  const reqParamIndex = url.indexOf("?", 0);
  url = url.substr(0,  reqParamIndex > 0 ? reqParamIndex: url.length);
  while (url.indexOf(".") > 0) {
    url = url.replace(".", "_");
  }
  url = url.replace(/[:/?=#\-+]/g, '_');
  return url;
}

async function captureScreenShot(Page, deviceProperties, supersized, url, error) {
  const fullscreen = supersized||false;
  const device = deviceProperties||{width:1366, height:1024, deviceScaleFactor:1, mobile:false, fitWindow:false}
  console.log(url);
  if (!Page) {
    error('Page object not available.');
  } else {
    const fs = require('fs');
    const filename = './scrapes/'+(fullscreen ? 'full_':'') + await generateFilename(url) + '.png'

    if (fullscreen) {
      const {contentSize:{height}} = await Page.getLayoutMetrics();
      device.height = height;
    }
    const screenshot = await Page.captureScreenshot({format: "png", fromSurface: true, clip:{x:0, y:0, width:device.width, height:device.height, scale:device.deviceScaleFactor}});

    fs.writeFile(filename, new Buffer(screenshot.data, 'base64'), 'base64', function(err) {
      if (err) {
        error(err);
      } else {
        console.log('Screenshot saved');
      }
    });
  }
}

async function preHook(url, client) {
    /*
    const {Network, Emulation} = client;

    Network.canEmulateNetworkConditions().catch(function () {
      console.log("Do not support network emulation!atom");
    });

    Network.canClearBrowserCache().catch(function () {
      console.log("Do not support cache clear!");
    });
    Network.setCacheDisabled({cacheDisabled:true});
    Network.enable();
    Network.emulateNetworkConditions({offline: false, latency: 0, downloadThroughput: -1 , uploadThroughput: -1, connectioType:"none"});
    Network.clearBrowserCache();

    await Emulation.setDeviceMetricsOverride(deviceMetrics);
    await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
    */
}

async function postHook(url, client) {
    /*
    console.log('dumping screenshot');
    const {Page, DOM, Emulation, Browser} = client;
    await captureScreenShot(Page, deviceMetrics, false, url, ()=>{
      console.log('Screen grabbed.');
    });
    await setTimeout(function(){console.log('sleeping');}, 5000);
    */
}

function prettify(url) {
    try {
        const {parse, format} = require('url');
        const urlObject = parse(url);
        urlObject.protocol = chalk.gray(urlObject.protocol.slice(0, -1));
        urlObject.host = chalk.bold(urlObject.host);
        return format(urlObject).replace(/[:/?=#]/g, chalk.gray('$&'));
    } catch (err) {
        // invalid URL delegate error detection
        return url;
    }
}

function log(string) {
    process.stderr.write(string);
}

CHC.run(urls, {
    host, port,
    viewportWidth, viewportHeight,
    content,
    timeout,
    parallel,
    preHook, postHook
}).on('load', (url) => {
    log(`- ${prettify(url)} `);
}).on('done', (url) => {
    log(chalk.green('✓\n'));
}).on('fail', (url, err) => {
    log(chalk.red(`✗\n  ${err.message}\n`));
}).on('har', (har) => {
    const fs = require('fs');
    const json = JSON.stringify(har, null, 4);
    const output = fs.createWriteStream('page.har');
    output.write(json);
    output.write('\n');
});
