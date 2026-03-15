'use strict';

/**
 * @version 2.2.4
 * @overview QZ Tray Connector
 * @license LGPL-2.1-only
 * 
 * Connects a web client to the QZ Tray software.
 * Enables printing and device communication from javascript.
 * 
 * LOCAL COPY - Hosted locally to avoid CDN/CSP issues
 */
var qz = (function() {

///// POLYFILLS /////

    if (!Array.isArray) {
        Array.isArray = function(arg) {
            return Object.prototype.toString.call(arg) === '[object Array]';
        };
    }

    if (!Number.isInteger) {
        Number.isInteger = function(value) {
            return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
        };
    }

///// PRIVATE METHODS /////

    var _qz = {
        VERSION: "2.2.4",
        DEBUG: false,

        log: {
            trace: function() { if (_qz.DEBUG) { console.log.apply(console, arguments); } },
            info: function() { console.info.apply(console, arguments); },
            warn: function() { console.warn.apply(console, arguments); },
            allay: function() { if (_qz.DEBUG) { console.warn.apply(console, arguments); } },
            error: function() { console.error.apply(console, arguments); }
        },

        streams: {
            serial: 'SERIAL', usb: 'USB', hid: 'HID', printer: 'PRINTER', file: 'FILE', socket: 'SOCKET'
        },

        websocket: {
            connection: null,
            shutdown: false,

            connectConfig: {
                host: ["localhost", "localhost.qz.io"],
                hostIndex: 0,
                usingSecure: true,
                protocol: {
                    secure: "wss://",
                    insecure: "ws://"
                },
                port: {
                    secure: [8181, 8282, 8383, 8484],
                    insecure: [8182, 8283, 8384, 8485],
                    portIndex: 0
                },
                keepAlive: 60,
                retries: 0,
                delay: 0
            },

            setup: {
                findConnection: function(config, resolve, reject) {
                    if (_qz.websocket.shutdown) {
                        reject(new Error("Connection attempt cancelled by user"));
                        return;
                    }

                    if (!config.port.secure.length) {
                        if (!config.port.insecure.length) {
                            reject(new Error("No ports have been specified to connect over"));
                            return;
                        } else if (config.usingSecure) {
                            _qz.log.error("No secure ports specified - forcing insecure connection");
                            config.usingSecure = false;
                        }
                    } else if (!config.port.insecure.length && !config.usingSecure) {
                        _qz.log.trace("No insecure ports specified - forcing secure connection");
                        config.usingSecure = true;
                    }

                    var deeper = function() {
                        if (_qz.websocket.shutdown) {
                            reject(new Error("Connection attempt cancelled by user"));
                            return;
                        }

                        config.port.portIndex++;

                        if ((config.usingSecure && config.port.portIndex >= config.port.secure.length)
                            || (!config.usingSecure && config.port.portIndex >= config.port.insecure.length)) {
                            if (config.hostIndex >= config.host.length - 1) {
                                reject(new Error("Unable to establish connection with QZ"));
                                return;
                            } else {
                                config.hostIndex++;
                                config.port.portIndex = 0;
                            }
                        }

                        _qz.websocket.setup.findConnection(config, resolve, reject);
                    };

                    var address;
                    if (config.usingSecure) {
                        address = config.protocol.secure + config.host[config.hostIndex] + ":" + config.port.secure[config.port.portIndex];
                    } else {
                        address = config.protocol.insecure + config.host[config.hostIndex] + ":" + config.port.insecure[config.port.portIndex];
                    }

                    try {
                        _qz.log.trace("Attempting connection", address);
                        _qz.websocket.connection = new _qz.tools.ws(address);
                    }
                    catch(err) {
                        _qz.log.error(err);
                        deeper();
                        return;
                    }

                    if (_qz.websocket.connection != null) {
                        _qz.websocket.connection.established = false;

                        _qz.websocket.connection.onopen = function(evt) {
                            if (!_qz.websocket.connection.established) {
                                _qz.log.trace(evt);
                                _qz.log.info("Established connection with QZ Tray on " + address);

                                _qz.websocket.setup.openConnection({ resolve: resolve, reject: reject });

                                if (config.keepAlive > 0) {
                                    var interval = setInterval(function() {
                                        if (!_qz.tools.isActive() || _qz.websocket.connection.interval !== interval) {
                                            clearInterval(interval);
                                            return;
                                        }

                                        _qz.websocket.connection.send("ping");
                                    }, config.keepAlive * 1000);

                                    _qz.websocket.connection.interval = interval;
                                }
                            }
                        };

                        _qz.websocket.connection.onclose = function() {
                            if (_qz.websocket.connection && typeof navigator !== 'undefined' && navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1) {
                                _qz.websocket.connection.onerror();
                            }
                        };

                        _qz.websocket.connection.onerror = function(evt) {
                            _qz.log.trace(evt);

                            _qz.websocket.connection = null;

                            deeper();
                        };
                    } else {
                        reject(new Error("Unable to create a websocket connection"));
                    }
                },

                openConnection: function(openPromise) {
                    _qz.websocket.connection.established = true;

                    _qz.websocket.connection.onclose = function(evt) {
                        _qz.log.trace(evt);

                        _qz.websocket.connection = null;
                        _qz.websocket.callClose(evt);
                        _qz.log.info("Closed connection with QZ Tray");

                        for(var uid in _qz.websocket.pendingCalls) {
                            if (_qz.websocket.pendingCalls.hasOwnProperty(uid)) {
                                _qz.websocket.pendingCalls[uid].reject(new Error("Connection closed before response received"));
                            }
                        }

                        if (this.promise != undefined) {
                            this.promise.resolve();
                        }
                    };

                    _qz.websocket.connection.onerror = function(evt) {
                        _qz.websocket.callError(evt);
                    };

                    _qz.websocket.connection.sendData = function(obj) {
                        _qz.log.trace("Preparing object for websocket", obj);

                        if (obj.timestamp == undefined) {
                            obj.timestamp = Date.now();
                            if (typeof obj.timestamp !== 'number') {
                                obj.timestamp = new Date().getTime();
                            }
                        }
                        if (obj.promise != undefined) {
                            obj.uid = _qz.websocket.setup.newUID();
                            _qz.websocket.pendingCalls[obj.uid] = obj.promise;
                        }

                        obj.position = {
                            x: typeof screen !== 'undefined' ? ((screen.availWidth || screen.width) / 2) + (screen.left || screen.availLeft || 0) : 0,
                            y: typeof screen !== 'undefined' ? ((screen.availHeight || screen.height) / 2) + (screen.top || screen.availTop || 0) : 0
                        };

                        try {
                            if (obj.call != undefined && obj.signature == undefined && _qz.security.needsSigned(obj.call)) {
                                var signObj = {
                                    call: obj.call,
                                    params: obj.params,
                                    timestamp: obj.timestamp
                                };

                                var hashing = _qz.tools.hash(_qz.tools.stringify(signObj));
                                if (!hashing.then) {
                                    hashing = _qz.tools.promise(function(resolve) {
                                        resolve(hashing);
                                    });
                                }

                                hashing.then(function(hashed) {
                                    return _qz.security.callSign(hashed);
                                }).then(function(signature) {
                                    _qz.log.trace("Signature for call", signature);
                                    obj.signature = signature || "";
                                    obj.signAlgorithm = _qz.security.signAlgorithm;

                                    _qz.signContent = undefined;
                                    _qz.websocket.connection.send(_qz.tools.stringify(obj));
                                }).catch(function(err) {
                                    _qz.log.error("Signing failed", err);

                                    if (obj.promise != undefined) {
                                        obj.promise.reject(new Error("Failed to sign request"));
                                        delete _qz.websocket.pendingCalls[obj.uid];
                                    }
                                });
                            } else {
                                _qz.log.trace("Signature for call", obj.signature);

                                _qz.websocket.connection.send(_qz.tools.stringify(obj));
                            }
                        }
                        catch(err) {
                            _qz.log.error(err);

                            if (obj.promise != undefined) {
                                obj.promise.reject(err);
                                delete _qz.websocket.pendingCalls[obj.uid];
                            }
                        }
                    };

                    _qz.websocket.connection.onmessage = function(evt) {
                        var returned = JSON.parse(evt.data);

                        if (returned.uid == null) {
                            if (returned.type == null) {
                                _qz.websocket.connection.close(4003, "Connected to incompatible QZ Tray version");

                            } else {
                                switch(returned.type) {
                                    case _qz.streams.serial:
                                        if (!returned.event) {
                                            returned.event = JSON.stringify({ portName: returned.key, output: returned.data });
                                        }

                                        _qz.serial.callSerial(JSON.parse(returned.event));
                                        break;
                                    case _qz.streams.socket:
                                        _qz.socket.callSocket(JSON.parse(returned.event));
                                        break;
                                    case _qz.streams.usb:
                                        if (!returned.event) {
                                            returned.event = JSON.stringify({ vendorId: returned.key[0], productId: returned.key[1], output: returned.data });
                                        }

                                        _qz.usb.callUsb(JSON.parse(returned.event));
                                        break;
                                    case _qz.streams.hid:
                                        _qz.hid.callHid(JSON.parse(returned.event));
                                        break;
                                    case _qz.streams.printer:
                                        _qz.printers.callPrinter(JSON.parse(returned.event));
                                        break;
                                    case _qz.streams.file:
                                        _qz.file.callFile(JSON.parse(returned.event));
                                        break;
                                    default:
                                        _qz.log.allay("Cannot determine stream type for callback", returned);
                                        break;
                                }
                            }

                            return;
                        }

                        _qz.log.trace("Received response from websocket", returned);

                        var promise = _qz.websocket.pendingCalls[returned.uid];
                        if (promise == undefined) {
                            _qz.log.allay('No promise found for returned response');
                        } else {
                            if (returned.error != undefined) {
                                promise.reject(new Error(returned.error));
                            } else {
                                promise.resolve(returned.result);
                            }
                        }

                        delete _qz.websocket.pendingCalls[returned.uid];
                    };


                    function sendCert(cert) {
                        if (cert === undefined) { cert = null; }

                        qz.api.getVersion().then(function(version) {
                            _qz.websocket.connection.version = version;
                            _qz.websocket.connection.semver = version.toLowerCase().replace(/-rc\./g, "-rc").split(/[\\+\\.-]/g);
                            for(var i = 0; i < _qz.websocket.connection.semver.length; i++) {
                                try {
                                    if (i == 3 && _qz.websocket.connection.semver[i].toLowerCase().indexOf("rc") == 0) {
                                        _qz.websocket.connection.semver[i] = -(_qz.websocket.connection.semver[i].replace(/\D/g, ""));
                                        continue;
                                    }
                                    _qz.websocket.connection.semver[i] = parseInt(_qz.websocket.connection.semver[i]);
                                }
                                catch(ignore) {}

                                if (_qz.websocket.connection.semver.length < 4) {
                                    _qz.websocket.connection.semver[3] = 0;
                                }
                            }

                            _qz.compatible.algorithm(true);
                        }).then(function() {
                            _qz.websocket.connection.sendData({ certificate: cert, promise: openPromise });
                        });
                    }

                    _qz.security.callCert().then(sendCert).catch(function(error) {
                        _qz.log.warn("Failed to get certificate:", error);

                        if (_qz.security.rejectOnCertFailure) {
                            openPromise.reject(error);
                        } else {
                            sendCert(null);
                        }
                    });
                },

                newUID: function() {
                    var len = 6;
                    return (new Array(len + 1).join("0") + (Math.random() * Math.pow(36, len) << 0).toString(36)).slice(-len)
                }
            },

            dataPromise: function(callName, params, signature, signingTimestamp) {
                return _qz.tools.promise(function(resolve, reject) {
                    var msg = {
                        call: callName,
                        promise: { resolve: resolve, reject: reject },
                        params: params,
                        signature: signature,
                        timestamp: signingTimestamp
                    };

                    _qz.websocket.connection.sendData(msg);
                });
            },

            pendingCalls: {},

            errorCallbacks: [],
            callError: function(evt) {
                if (Array.isArray(_qz.websocket.errorCallbacks)) {
                    for(var i = 0; i < _qz.websocket.errorCallbacks.length; i++) {
                        _qz.websocket.errorCallbacks[i](evt);
                    }
                } else {
                    _qz.websocket.errorCallbacks(evt);
                }
            },

            closedCallbacks: [],
            callClose: function(evt) {
                if (Array.isArray(_qz.websocket.closedCallbacks)) {
                    for(var i = 0; i < _qz.websocket.closedCallbacks.length; i++) {
                        _qz.websocket.closedCallbacks[i](evt);
                    }
                } else {
                    _qz.websocket.closedCallbacks(evt);
                }
            }
        },


        printing: {
            defaultConfig: {
                bounds: null,
                colorType: 'color',
                copies: 1,
                density: 0,
                duplex: false,
                fallbackDensity: null,
                interpolation: 'bicubic',
                jobName: null,
                legacy: false,
                margins: 0,
                orientation: null,
                paperThickness: null,
                printerTray: null,
                rasterize: false,
                rotation: 0,
                scaleContent: true,
                size: null,
                units: 'in',

                forceRaw: false,
                encoding: null,
                spool: null
            }
        },


        serial: {
            serialCallbacks: [],
            callSerial: function(streamEvent) {
                if (Array.isArray(_qz.serial.serialCallbacks)) {
                    for(var i = 0; i < _qz.serial.serialCallbacks.length; i++) {
                        _qz.serial.serialCallbacks[i](streamEvent);
                    }
                } else {
                    _qz.serial.serialCallbacks(streamEvent);
                }
            }
        },


        socket: {
            socketCallbacks: [],
            callSocket: function(socketEvent) {
                if (Array.isArray(_qz.socket.socketCallbacks)) {
                    for(var i = 0; i < _qz.socket.socketCallbacks.length; i++) {
                        _qz.socket.socketCallbacks[i](socketEvent);
                    }
                } else {
                    _qz.socket.socketCallbacks(socketEvent);
                }
            }
        },


        usb: {
            usbCallbacks: [],
            callUsb: function(streamEvent) {
                if (Array.isArray(_qz.usb.usbCallbacks)) {
                    for(var i = 0; i < _qz.usb.usbCallbacks.length; i++) {
                        _qz.usb.usbCallbacks[i](streamEvent);
                    }
                } else {
                    _qz.usb.usbCallbacks(streamEvent);
                }
            }
        },


        hid: {
            hidCallbacks: [],
            callHid: function(streamEvent) {
                if (Array.isArray(_qz.hid.hidCallbacks)) {
                    for(var i = 0; i < _qz.hid.hidCallbacks.length; i++) {
                        _qz.hid.hidCallbacks[i](streamEvent);
                    }
                } else {
                    _qz.hid.hidCallbacks(streamEvent);
                }
            }
        },


        printers: {
            printerCallbacks: [],
            callPrinter: function(evt) {
                if (Array.isArray(_qz.printers.printerCallbacks)) {
                    for(var i = 0; i < _qz.printers.printerCallbacks.length; i++) {
                        _qz.printers.printerCallbacks[i](evt);
                    }
                } else {
                    _qz.printers.printerCallbacks(evt);
                }
            }
        },


        file: {
            fileCallbacks: [],
            callFile: function(evt) {
                if (Array.isArray(_qz.file.fileCallbacks)) {
                    for(var i = 0; i < _qz.file.fileCallbacks.length; i++) {
                        _qz.file.fileCallbacks[i](evt);
                    }
                } else {
                    _qz.file.fileCallbacks(evt);
                }
            }
        },


        security: {
            certPromise: function(resolve) { resolve(); },
            signPromise: function(resolve) { resolve(); },
            signAlgorithm: "SHA512",
            rejectOnCertFailure: false,

            callCert: function() {
                return _qz.tools.promise(_qz.security.certPromise);
            },

            callSign: function(toSign) {
                return _qz.tools.promise(function(resolve, reject) {
                    _qz.security.signPromise(resolve, reject, toSign);
                });
            },

            needsSigned: function(call) {
                return call && call !== 'websocket.getNetworkInfo' && call !== 'getVersion';
            }
        },


        compatible: {
            dataType: function(data, rawType) {
                if (Array.isArray(data)) {
                    var match = rawType ? "Array" : null;
                    for(var i = 0; i < data.length; i++) {
                        var type = _qz.compatible.dataType(data[i]);
                        if (match == null) {
                            match = type;
                        } else if (match != type) {
                            return null;
                        }
                    }

                    return match;
                }

                if (typeof data === 'object') {
                    if (data.data != undefined && data.type != undefined) {
                        return data;
                    }
                    if (data.type && data.format && data.flavor) {
                        return "Pixel";
                    }
                    if (data.data != undefined || data.flavor != undefined) {
                        return "Raw";
                    }
                }

                return rawType ? (typeof data) : null;
            },

            algorithm: function(showWarn) {
                if (_qz.security.signAlgorithm === "SHA1") {
                    if (_qz.tools.versionCompare(2, 1, 0, 0)) {
                        if (showWarn) { _qz.log.warn("QZ Tray 2.1 and newer does not support SHA1 signing"); }
                        return false;
                    }
                } else if (_qz.security.signAlgorithm !== "SHA512") {
                    if (showWarn) { _qz.log.warn("Signing algorithm \"" + _qz.security.signAlgorithm + "\" is not valid"); }
                    return false;
                }

                return true;
            }
        },


        tools: {
            ws: typeof WebSocket !== 'undefined' ? WebSocket : null,

            promise: function(resolver) {
                return new Promise(resolver);
            },

            stringify: function(object) {
                return JSON.stringify(object, function(key, value) {
                    if (value instanceof Uint8Array) {
                        return { data: Array.from(value), type: "BYTE_ARRAY" };
                    }
                    return value;
                });
            },

            hash: function(data) {
                if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
                    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(function(hash) {
                        return Array.from(new Uint8Array(hash)).map(function(b) { return ('0' + b.toString(16)).slice(-2); }).join('');
                    });
                } else {
                    return null;
                }
            },

            extend: function(destination, source) {
                for(var property in source) {
                    if (source.hasOwnProperty(property)) {
                        if (source[property] != undefined) {
                            if (source[property] !== null && source[property].constructor === Object) {
                                destination[property] = _qz.tools.extend(destination[property] || {}, source[property]);
                            } else {
                                destination[property] = source[property];
                            }
                        }
                    }
                }
                return destination;
            },

            isActive: function() {
                return _qz.websocket.connection != null && _qz.websocket.connection.readyState === 1;
            },

            versionCompare: function(major, minor, patch, build) {
                if (_qz.websocket.connection == null || _qz.websocket.connection.semver == undefined) {
                    return undefined;
                }

                var semver = _qz.websocket.connection.semver;
                if (semver[0] > major) { return true; }
                if (semver[0] < major) { return false; }
                if (semver[1] > minor) { return true; }
                if (semver[1] < minor) { return false; }
                if (semver[2] > patch) { return true; }
                if (semver[2] < patch) { return false; }
                if (semver[3] >= build) { return true; }
                return false;
            },

            absolute: function(loc) {
                var a = document.createElement('a');
                a.href = loc;
                return a.href;
            },

            relative: function(loc) {
                var first = _qz.tools.absolute(loc);
                var base = _qz.tools.absolute('.');
                if (first.substring(0, base.length) === base) {
                    return first.substring(base.length);
                }
                return first;
            }
        }
    };


///// PUBLIC METHODS /////

    return {
        /**
         * Retrieves QZ Tray API version information
         * @returns {Object}
         */
        api: {
            getVersion: function() {
                return _qz.websocket.dataPromise('getVersion');
            },
            getMaxPayload: function() {
                return _qz.websocket.dataPromise('api.getMaxPayload');
            },
            showDebug: function(show) {
                _qz.DEBUG = show;
            },
            isDebug: function() {
                return _qz.DEBUG;
            },
            setSha256Type: function(hashFunction) {
                _qz.tools.hash = hashFunction;
            },
            setPromiseType: function(promiseFunction) {
                _qz.tools.promise = promiseFunction;
            },
            setWebSocketType: function(wsFunction) {
                _qz.tools.ws = wsFunction;
            }
        },

        /**
         * Provides methods for connecting and interacting with QZ Tray WebSocket
         */
        websocket: {
            connect: function(options) {
                return _qz.tools.promise(function(resolve, reject) {
                    if (_qz.tools.isActive()) {
                        reject(new Error("An open connection already exists"));
                        return;
                    }

                    _qz.websocket.shutdown = false;

                    var config = _qz.tools.extend({}, _qz.websocket.connectConfig);
                    _qz.tools.extend(config, options);

                    if (typeof config.host === 'string') {
                        config.host = [config.host];
                    }

                    if (config.delay > 0) {
                        setTimeout(function() {
                            _qz.websocket.setup.findConnection(config, resolve, reject);
                        }, config.delay * 1000);
                    } else {
                        _qz.websocket.setup.findConnection(config, resolve, reject);
                    }
                });
            },

            disconnect: function() {
                return _qz.tools.promise(function(resolve, reject) {
                    _qz.websocket.shutdown = true;

                    if (_qz.websocket.connection != null) {
                        _qz.websocket.connection.promise = { resolve: resolve, reject: reject };
                        _qz.websocket.connection.close();
                    } else {
                        resolve();
                    }
                });
            },

            isActive: function() {
                return _qz.tools.isActive();
            },

            getConnectionInfo: function() {
                return _qz.websocket.dataPromise('websocket.getNetworkInfo');
            },

            setClosedCallbacks: function(calls) {
                _qz.websocket.closedCallbacks = calls;
            },

            setErrorCallbacks: function(calls) {
                _qz.websocket.errorCallbacks = calls;
            }
        },

        /**
         * Security signing and certificate handling
         */
        security: {
            setCertificatePromise: function(promiseFunction) {
                _qz.security.certPromise = promiseFunction;
            },

            setSignaturePromise: function(promiseFunction) {
                _qz.security.signPromise = promiseFunction;
            },

            setSignatureAlgorithm: function(algorithm) {
                _qz.security.signAlgorithm = algorithm;
                _qz.compatible.algorithm(true);
            },

            getSignatureAlgorithm: function() {
                return _qz.security.signAlgorithm;
            },

            setRejectOnCertFailure: function(reject) {
                _qz.security.rejectOnCertFailure = reject;
            }
        },

        /**
         * Printer configuration
         */
        configs: {
            create: function(printer, options) {
                var config = _qz.tools.extend({}, _qz.printing.defaultConfig);
                _qz.tools.extend(config, options);
                config.printer = printer;
                return config;
            },

            setDefaults: function(options) {
                _qz.tools.extend(_qz.printing.defaultConfig, options);
            }
        },

        /**
         * Printer enumeration
         */
        printers: {
            find: function(query) {
                var params = null;
                if (query) {
                    params = { query: query };
                }
                return _qz.websocket.dataPromise('printers.find', params);
            },

            getDefault: function() {
                return _qz.websocket.dataPromise('printers.getDefault');
            },

            details: function(query) {
                return _qz.websocket.dataPromise('printers.detail', { query: query });
            },

            startListening: function(printer) {
                return _qz.websocket.dataPromise('printers.startListening', { printer: printer });
            },

            stopListening: function() {
                return _qz.websocket.dataPromise('printers.stopListening');
            },

            getStatus: function() {
                return _qz.websocket.dataPromise('printers.getStatus');
            },

            setPrinterCallbacks: function(calls) {
                _qz.printers.printerCallbacks = calls;
            }
        },

        /**
         * Print operations
         */
        print: function(config, data, signature, signingTimestamp) {
            var params = {
                printer: config.printer,
                options: config,
                data: data
            };
            return _qz.websocket.dataPromise('print', params, signature, signingTimestamp);
        },

        /**
         * Serial port operations
         */
        serial: {
            findPorts: function() {
                return _qz.websocket.dataPromise('serial.findPorts');
            },

            openPort: function(port, options) {
                return _qz.websocket.dataPromise('serial.openPort', { port: port, options: options || {} });
            },

            sendData: function(port, data, options) {
                return _qz.websocket.dataPromise('serial.sendData', { port: port, data: data, options: options || {} });
            },

            closePort: function(port) {
                return _qz.websocket.dataPromise('serial.closePort', { port: port });
            },

            setSerialCallbacks: function(calls) {
                _qz.serial.serialCallbacks = calls;
            }
        },

        /**
         * Network socket operations
         */
        socket: {
            open: function(host, port, options) {
                return _qz.websocket.dataPromise('socket.open', { host: host, port: port, options: options || {} });
            },

            sendData: function(host, port, data, options) {
                return _qz.websocket.dataPromise('socket.sendData', { host: host, port: port, data: data, options: options || {} });
            },

            close: function(host, port) {
                return _qz.websocket.dataPromise('socket.close', { host: host, port: port });
            },

            setSocketCallbacks: function(calls) {
                _qz.socket.socketCallbacks = calls;
            }
        },

        /**
         * USB operations
         */
        usb: {
            listDevices: function(includeHubs) {
                return _qz.websocket.dataPromise('usb.listDevices', { includeHubs: includeHubs });
            },

            listInterfaces: function(vendorId, productId) {
                return _qz.websocket.dataPromise('usb.listInterfaces', { vendorId: vendorId, productId: productId });
            },

            listEndpoints: function(vendorId, productId, iface) {
                return _qz.websocket.dataPromise('usb.listEndpoints', { vendorId: vendorId, productId: productId, iface: iface });
            },

            claimDevice: function(vendorId, productId, iface) {
                return _qz.websocket.dataPromise('usb.claimDevice', { vendorId: vendorId, productId: productId, iface: iface });
            },

            sendData: function(vendorId, productId, endpoint, data, options) {
                return _qz.websocket.dataPromise('usb.sendData', { vendorId: vendorId, productId: productId, endpoint: endpoint, data: data, options: options });
            },

            readData: function(vendorId, productId, endpoint, responseSize) {
                return _qz.websocket.dataPromise('usb.readData', { vendorId: vendorId, productId: productId, endpoint: endpoint, responseSize: responseSize });
            },

            openStream: function(vendorId, productId, endpoint, responseSize, interval) {
                return _qz.websocket.dataPromise('usb.openStream', { vendorId: vendorId, productId: productId, endpoint: endpoint, responseSize: responseSize, interval: interval });
            },

            closeStream: function(vendorId, productId, endpoint) {
                return _qz.websocket.dataPromise('usb.closeStream', { vendorId: vendorId, productId: productId, endpoint: endpoint });
            },

            releaseDevice: function(vendorId, productId) {
                return _qz.websocket.dataPromise('usb.releaseDevice', { vendorId: vendorId, productId: productId });
            },

            setUsbCallbacks: function(calls) {
                _qz.usb.usbCallbacks = calls;
            }
        },

        /**
         * HID operations
         */
        hid: {
            listDevices: function() {
                return _qz.websocket.dataPromise('hid.listDevices');
            },

            claimDevice: function(vendorId, productId, usagePage, serial) {
                return _qz.websocket.dataPromise('hid.claimDevice', { vendorId: vendorId, productId: productId, usagePage: usagePage, serial: serial });
            },

            sendData: function(vendorId, productId, data, endpoint) {
                return _qz.websocket.dataPromise('hid.sendData', { vendorId: vendorId, productId: productId, data: data, endpoint: endpoint });
            },

            readData: function(vendorId, productId, responseSize) {
                return _qz.websocket.dataPromise('hid.readData', { vendorId: vendorId, productId: productId, responseSize: responseSize });
            },

            openStream: function(vendorId, productId, responseSize, interval) {
                return _qz.websocket.dataPromise('hid.openStream', { vendorId: vendorId, productId: productId, responseSize: responseSize, interval: interval });
            },

            closeStream: function(vendorId, productId) {
                return _qz.websocket.dataPromise('hid.closeStream', { vendorId: vendorId, productId: productId });
            },

            releaseDevice: function(vendorId, productId) {
                return _qz.websocket.dataPromise('hid.releaseDevice', { vendorId: vendorId, productId: productId });
            },

            setHidCallbacks: function(calls) {
                _qz.hid.hidCallbacks = calls;
            }
        },

        /**
         * File operations
         */
        file: {
            list: function(path, params) {
                return _qz.websocket.dataPromise('file.list', { path: path, params: params });
            },

            read: function(path, params) {
                return _qz.websocket.dataPromise('file.read', { path: path, params: params });
            },

            write: function(path, data, params) {
                return _qz.websocket.dataPromise('file.write', { path: path, data: data, params: params });
            },

            remove: function(path, params) {
                return _qz.websocket.dataPromise('file.remove', { path: path, params: params });
            },

            startListening: function(path, params) {
                return _qz.websocket.dataPromise('file.startListening', { path: path, params: params });
            },

            stopListening: function(path) {
                return _qz.websocket.dataPromise('file.stopListening', { path: path });
            },

            setFileCallbacks: function(calls) {
                _qz.file.fileCallbacks = calls;
            }
        },

        /**
         * Networking operations
         */
        networking: {
            device: function(hostname) {
                return _qz.websocket.dataPromise('networking.device', { hostname: hostname });
            },

            devices: function() {
                return _qz.websocket.dataPromise('networking.devices');
            },

            hostname: function() {
                return _qz.websocket.dataPromise('networking.hostname');
            }
        },

        /**
         * Printer Tray operations
         */
        tray: {
            find: function(printer, paperSize) {
                return _qz.websocket.dataPromise('tray.find', { printer: printer, paperSize: paperSize });
            }
        }
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = qz;
}
