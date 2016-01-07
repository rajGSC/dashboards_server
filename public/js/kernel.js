/**
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
define([
    'jupyter-js-services'
], function(Services) {

    var _outputAreaHandledMsgs = {
        'clear_output': 1,
        'stream': 1,
        'display_data': 1,
        'execute_result': 1,
        'error': 1
    };

    var _kernel;

    function _startKernel() {
        var loc = window.location;
        var kernelUrl = loc.protocol + '//' + loc.host;

        var kernelOptions = {
            baseUrl: kernelUrl,
            wsUrl: kernelUrl.replace(/^http/, 'ws'),
            name: 'python3',
            clientId: _uuid()
        };
        var ajaxOptions = {
            requestHeaders: {
                'X-jupyter-notebook-path': window.location.pathname,
                'X-jupyter-session-id': kernelOptions.clientId
            }
        };

        return Services.startNewKernel(kernelOptions, ajaxOptions)
            .then(function(kernel) {
                _kernel = kernel;

                // show a busy indicator when communicating with kernel
                var debounced;
                kernel.statusChanged.connect(function(_kernel, status) {
                    clearTimeout(debounced);
                    debounced = setTimeout(function() {
                        var isBusy = status === Services.KernelStatus.Busy;
                        $('.busy-indicator')
                            .toggleClass('show', isBusy)
                            // Prevent progress animation when hidden by removing 'active' class.
                            .find('.progress-bar')
                                .toggleClass('active', isBusy);
                    }, 500);
                });
                kernel.commOpened.connect(function(_kernel, commMsg) {
                    var comm = kernel.connectToComm(commMsg.target_name, commMsg.comm_id);
                });
                return kernel;
            })
            .catch(function(e) {
                console.error('failed to create kernel', e);
            });
    }

    /**
     * Get a random 128b hex string (not a formal UUID)
     * (from jupyter-js-services/utils.js)
     */
    function _uuid() {
        var s = [];
        var hexDigits = "0123456789abcdef";
        var nChars = hexDigits.length;
        for (var i = 0; i < 32; i++) {
            s[i] = hexDigits.charAt(Math.floor(Math.random() * nChars));
        }
        return s.join("");
    }

    function _execute(cellIndex, resultHandler) {
        var future = _kernel.execute({
            code: cellIndex + '',
            silent: false,
            stop_on_error: true,
            allow_stdin: false
        });
        future.onIOPub = function(msg) {
            if (msg.msg_type in _outputAreaHandledMsgs) {
                resultHandler(msg);
            }
        };
        return future;
        // TODO error handling
    }

    return {
        start: _startKernel,
        execute: _execute
    };
});
