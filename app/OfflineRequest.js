'use strict';

/* global document, navigator, XMLHttpRequest */

const strictUriEncode = str =>
    encodeURIComponent(str)
    .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));

class OfflineRequest {
    constructor (method, url, params) {
        this.method = method;
        this.url    = url;
        this.params = params;

        const withDataMethods = ['post', 'put', 'patch'];

        if (withDataMethods.indexOf(this.method.toLowerCase()) === -1) {
            this.url    = `${this.url}?${OfflineRequest.qs(this.params)}`;
            this.params = null;
        } else {
            this.params = JSON.stringify(params);
        }
    }

    send () {
        if (!OfflineRequest.isWatchingForAlive) {
            OfflineRequest.checkForAlive();
        }

        return new Promise((resolve, reject) => {
            let req = new XMLHttpRequest();

            req.open(this.method.toUpperCase(), this.url, true);

            req.onload = () => {
                if (req.getResponseHeader('Content-Type').indexOf('application/json') > -1) {
                    try {
                        resolve(JSON.parse(req.responseText));
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    resolve(req.responseText);
                }
            };

            req.onerror = err => {
                reject(err);
            };

            if (navigator.onLine) {
                req.send(this.params);
            } else {
                OfflineRequest.pendingRequests.push([req, this.params]);
            }
        });
    }

    static get (url, args) {
        let req = new OfflineRequest('get', url, args);

        return req.send();
    }

    static post (url, args) {
        let req = new OfflineRequest('post', url, args);

        return req.send();
    }

    static head (url, args) {
        let req = new OfflineRequest('head', url, args);

        return req.send();
    }

    static patch (url, args) {
        let req = new OfflineRequest('patch', url, args);

        return req.send();
    }

    static checkForAlive () {
        OfflineRequest.isWatchingForAlive = true;

        // Debounce the ononline (as it can be fired multiple times in < 100ms)
        let timeout = 0;
        document.body.ononline = () => {
            clearTimeout(timeout);
            timeout = setTimeout(OfflineRequest.restore, 1500);
        };

        return this;
    }

    static restore () {
        // Resend all the requests
        OfflineRequest.pendingRequests.forEach(req_ => {
            let req  = req_[0];
            let data = req_[1];
            req.send(data);
        });
    }

    static qs (obj) {
        if (!obj) {
            return '';
        }

        return Object.keys(obj)
            .sort()
            .map(key => {
                let val = obj[key];

                if (val === undefined) {
                    return '';
                }

                if (val === null) {
                    return key;
                }

                if (Array.isArray(val)) {
                    return val.sort().map(val2 =>
                        strictUriEncode(key) + '=' + strictUriEncode(val2)
                    ).join('&');
                }

                return strictUriEncode(key) + '=' + strictUriEncode(val);
            })
            .filter(x => x.length > 0)
            .join('&');
    }
}

OfflineRequest.pendingRequests    = [];
OfflineRequest.isWatchingForAlive = false;

OfflineRequest
    .post('https://httpbin.org/post', {
        a: 'c'
    })
    .then(response => {
        console.log(response);
    })
    .catch(err => {
        console.log('err', err);
    });
