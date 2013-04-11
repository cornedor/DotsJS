/*jslint node: true */

const PORT          = 8080;
const HOST          = "0.0.0.0";

const DB_HOST       = "localhost";
const DB_USER       = "root";
const DB_PASSWORD   = "t00r";
const DB_DATABASE   = "homepage";

var server;
var Website = function () {
    "use strict";
    var filesToLoad = 0,
        templateData = {},
        req,
        res,
        page,
        timeoutTimer;
    function nullOut() {
        clearTimeout(timeoutTimer);
        filesToLoad = null;
        templateData = null;
        req = null;
        res = null;
        page = null;
        timeoutTimer = null;
    }
    function templateFiltered(html, cache, headers) {
        if (headers === undefined) {
            headers = {};
        }
        headers["Content-Type"] = "text/html";
        res.writeHead(200, headers);
        res.end(html);
        if (cache === true) {
            server.cached.push(page.host + page.port + page.url + page.get);
            server.cache.push(html);
        }
        nullOut();
    }
    function templateDataLoaded() {
        filesToLoad -= 1;
        if (filesToLoad === 0) {
            templateData.config.filter(templateData.dom, server, templateFiltered, res, req);
        }
    }
    function getConfig(url, type) {
        server.path.exists('./app/controller/' + url, function (exists) {
            if (exists) {
                delete require.cache[require.resolve('./app/controller/' + url)];
                var config = require('./app/controller/' + url);
                templateData[type] = config;
                templateDataLoaded();
            }
        });
    }
    function getTemplateData(url, type) {
        server.fs.readFile('app/view/' + url, 'utf-8', function (error, data) {
            if (error) {
                res.end('404: ' + error.message);
            } else {
                templateData[type] = data;
                templateDataLoaded();
            }
        });
    }
    function processPage() {
        var url = 'app/assets/' + page.host + page.url,
            filename = server.path.join(process.cwd(), url),
            mime,
            fileStream;
        server.path.exists(filename, function(exists) {
            if (!exists) {
                url = page.host + page.url;
                if (url.substr(-3, 3) === '.js') {
                    url = url.slice(0, -3);
                } else if (url.substr(-5, 5) === '.html') {
                    url = url.slice(0, -5);
                }
                filesToLoad += 2;
                getConfig(url + '.js', 'config');
                getTemplateData(url + '.html', 'dom');
                url = null;
            } else {
                mime = server.mime.lookup(filename);
                res.writeHead(200, mime);
                fileStream = server.fs.createReadStream(filename);
                fileStream.on('data', function(data) {
                    res.write(data);
                });
                fileStream.on('end', function() {
                    res.end();
                    fileStream = null;
                    nullOut();
                });
                mime = null;
            }
        });
    }
    return {
        init: function (request, response, parsedUrl) {
            req = request;
            res = response;
            page = parsedUrl;
            if (page.get.set === undefined) {
                page.get.set = server.remember;
            } else { server.remember = page.get.set; }
            timeoutTimer = setTimeout(function () {
                res.end('Timeout (20s)');
            }, 20000);
            processPage();
        }
    };
};
server = (function () {
    "use strict";
    var http = require('http'),
        mysql = require('mysql'),
        connection = mysql.createConnection({
            host:       DB_HOST,
            user:       DB_USER,
            password:   DB_PASSWORD,
            database:   DB_DATABASE
        });
    function parseUrl(req) {
        var host = req.headers.host,
            url = "",
            gets = [],
            get = [],
            port = 80,
            i,
            part,
            hostParts = [];
        if (host.indexOf("www.") === 0) {
            host = host.substr(4);
        }
        hostParts = host.split(":");
        host = hostParts[0];
        if (hostParts.length === 2) {
            port = hostParts[1];
        }

        url = decodeURIComponent(req.url.split("?")[0]);
        if (url === "/") { url = "/index.html"; }
        if (url[url.length - 1] === "/") {
            url = url.substring(0, url.length - 1);
        }

        gets = decodeURIComponent(req.url.split("?").slice(1).join("?")).split("&");
        if (gets.length > 0) {
            for (i = 0; i < gets.length; i += 1) {
                part = gets[i].split("=");
                get[part[0]] = part.slice(1).join("=");
            }
        }

        gets = null;
        part = null;
        hostParts = null;
        i = null;
        return {
            host: host,
            url: url,
            port: port,
            get: get
        };
    }
    connection.connect();
    return {
        init: function () {
            http.createServer(function (req, res) {
                var parsedUrl = parseUrl(req),
                    cacheIndex = server.cached.indexOf(parsedUrl.host + parsedUrl.port + parsedUrl.url + parsedUrl.get),
                    site;
                if (cacheIndex === -1) {
                    site = new Website();
                    site.init(req, res, parsedUrl);
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(server.cache[cacheIndex] + '<!-- NodeJS debug: From Cache -->');
                }

            }).listen(PORT, HOST);
            console.log('Server running');
            // server.shared.memwatchHD = new server.memwatch.HeapDiff();
        },
        fs: require('fs'),
        url: require('url'),
        mysql: connection,
        // memwatch: require('memwatch'),
        path: require('path'),
        mime: require('mime'),
        shared: [],
        cache: [],
        cached: []
    };
}());
server.init();