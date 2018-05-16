
const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));


const targetURL = argv.url || 'https://www.takealot.com';
const viewportWidth = argv.xdim || 1366;
const viewportHeight = argv.ydim || 1024;
const timeoutDelay = argv.timeout || 60000; // ms
const supersized = argv.supersizeme || false;

var device = {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: false,
  fitWindow: false
};

if(supersized){
  console.log("will capture full page");
}

async function captureScreenShot(Page, deviceProperties, supersized, error) {
  const fullscreen = supersized||false;
  const device = deviceProperties||{width:1366, height:1024, deviceScaleFactor:1, mobile:false, fitWindow:false}

  if (!Page) {
    error('Page object not available.');
  } else {
    const fs = require('fs');
    const filename = (fullscreen ? 'full_':'') + await generateFilename(targetURL) + '.png'

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
  return url;
}

CDP(async function(client){
  const {Emulation, Page, DOM, Input} = client;

  // Enable events on domains we are interested in.
  await Page.enable();
  await DOM.enable();

  // set viewport and visible size
  await Emulation.setDeviceMetricsOverride(device);
  await Emulation.setVisibleSize({width: device.width, height: device.height});
  await Page.navigate({url: targetURL});

  await Page.loadEventFired(async() => {
    captureScreenShot(Page, device, false, (err)=>{
      console.log('Error taking screenshot :' + err);
    });

    if (supersized) {
      console.log('Scrolling down, to ensure lazyloaded items are requested and rendered.');
      await Input.synthesizeScrollGesture({x:500, y:500, yDistance:-1000, speed:1000, repeatCount:10, repeatDelayMs:10});
      await Input.synthesizeScrollGesture({x:500, y:500, yDistance:1000, speed:1000, repeatCount:10, repeatDelayMs:10});
      console.log('Done scrolling.');
      captureScreenShot(Page, device, supersized, (err)=>{
        console.log('Error taking supersized screenshot :' + err);
      });
    }
  });

  setTimeout(async function() {
    console.log('Closing connection to the browser.');
    client.close();
  }, timeoutDelay);

}).on('error', err => {
  console.error('Cannot connect to browser:', err);
});
