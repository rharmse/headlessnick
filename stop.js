#!/usr/bin/node
'use strict'

const CDP = require('chrome-remote-interface');
const argv = require('minimist')(process.argv.slice(2));

CDP.Close({'id':argv.remoteTarget, function (err) {
  if (!err) {
    console.log('target is closing');
  }
}});
