/*globals XMLHttpRequest,XDomainRequest*/

define(["helpers"], function(helpers) {
    var API_BASE = "http://api-m2x.att.com/v1";

    function request(options, onSuccess, onError) {
        var xhr = new XMLHttpRequest();

        if ("withCredentials" in xhr) {
            // Check if the XMLHttpRequest object has a "withCredentials" property.
            // "withCredentials" only exists on XMLHTTPRequest2 objects.
            xhr.open(options.verb, options.path, true);

        } else if (typeof XDomainRequest !== "undefined") {
            // Otherwise, check if XDomainRequest.
            // XDomainRequest only exists in IE, and is IE's (8 & 9) way of making CORS requests.
            xhr = new XDomainRequest();
            xhr.open(options.verb, options.path);

        } else {
            // Otherwise, CORS is not supported by the browser.
            throw "CORS is not supported by this browser.";
        }

        for (var header in options.headers) {
            xhr.setRequestHeader(header, options.headers[header]);
        }

        xhr.onerror = onError;
        xhr.onload = function() {
            if (onSuccess) {
                var data = JSON.parse(xhr.responseText);
                onSuccess.apply(xhr, [data]);
            }
        }

        xhr.send(options.body);

        return xhr;
    }


    var Client = function(apiKey, apiBase) {
        this.apiKey = apiKey;
        this.apiBase = apiBase || API_BASE;

        this.defaultHeaders = {
            "X-M2X-KEY": this.apiKey
        };

        // Define request methods by verb. We could use forEach but it wouldn't work on IE8.
        var verbs = ['get', 'post', 'put', 'del', 'head', 'options', 'patch'], vi;
        for (vi = 0; vi < verbs.length; vi++) {
            var verb = verbs[vi];
            this[verb] = function(verb) {
                return function(path, options, cb) {
                    this.request(verb, path, options, cb);
                };
            }(verb);
        }
    };

    Client.prototype.request = function(verb, path, options, cb) {
        var body, headers;

        if (typeof options === "function") {
            // callback was sent in place of options
            cb = options;
            options = {};
        }

        headers = helpers.extend(this.defaultHeaders, options.headers || {});

        if (! headers["Content-Type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }

        if (options.params) {
            switch (headers["Content-Type"]) {
            case "application/json":
                body = JSON.stringify(options.params);
                break;

            case "application/x-www-form-urlencoded":
                var param;
                for (param in options.params) {
                    var value = options.params[param];
                    body = body ? body + "&" : "";
                    body += encodeURIComponent(param) + "=" + encodeURIComponent(value);
                }
                break;

            default:
                throw "Unrecognized Content-Type `" + headers["Content-Type"] + "`";
            }
        }

        request({
            path: this.apiBase + path,
            qs: options.qs,
            verb: verb,
            headers: headers,
            body: body
        }, cb, function() {
            // TODO: handle errors
        });
    };

    return Client;
});