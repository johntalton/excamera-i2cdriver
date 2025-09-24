# Excamera Labs I2CDriver

Provides a JavaScript API for the I²C driver. Works well in the browser via [SerialPort](https://developer.mozilla.org/en-US/docs/Web/API/SerialPort)

[![npm Version](http://img.shields.io/npm/v/@johntalton/excamera-i2cdriver.svg)](https://www.npmjs.com/package/@johntalton/excamera-i2cdriver)
![GitHub package.json version](https://img.shields.io/github/package-json/v/johntalton/excamera-i2cdriver)
[![CI](https://github.com/johntalton/excamera-i2cdriver/actions/workflows/CI.yml/badge.svg)](https://github.com/johntalton/excamera-i2cdriver/actions/workflows/CI.yml)


# Capture Mode

Capture mode is supported via function generator stream.

The `eventStreamFromReader` factory can be called with a `ReadableStream` to create state-machine stream that will `yield` the i²c events.

This can be used to replicate the excameras native visualization as the raw date is provided for each event. (alternatively constructing a function generator from lower level components)