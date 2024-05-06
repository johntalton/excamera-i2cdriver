# excamera-i2cdriver

[![npm Version](http://img.shields.io/npm/v/@johntalton/excamera-i2cdriver.svg)](https://www.npmjs.com/package/@johntalton/excamera-i2cdriver)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/excamera-i2cdriver)
![CI](https://github.com/johntalton/excamera-i2cdriver/workflows/CI/badge.svg)
![GitHub](https://img.shields.io/github/license/johntalton/excamera-i2cdriver)
[![Downloads Per Month](http://img.shields.io/npm/dm/@johntalton/excamera-i2cdriver.svg)](https://www.npmjs.com/package/@johntalton/excamera-i2cdriver)
![GitHub last commit](https://img.shields.io/github/last-commit/johntalton/excamera-i2cdriver)

Excamera labs I2CDriver

Provides a JavaScript API for the i²c driver. Works well in the browser via [SerialPort](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort)

# Capture Mode

Capture mode is supported via function generator stream.

The `eventStreamFromReader` factory can be called with a `ReadableStream` to create state-machine stream that will `yield` the i²c events.

This can be used to replicate the excameras native visualization as the raw date is provided for each event. (alternatively constructing a function generator from lower level components)