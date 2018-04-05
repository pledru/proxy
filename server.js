const https = require('https');
const fs = require('fs');
const stream = require('stream').Transform;
const host = process.argv[2];
const dynamic = process.argv[3];

const credentials = {
    key: fs.readFileSync('./certificate/key.pem'),
    cert: fs.readFileSync('./certificate/key-cert.pem')
};

function forwardRequest(webReq, webResp, xml) {
    let options = {
        host: host,
        port: 215,
        path: webReq.url,
        cookie: true,
        rejectUnauthorized: false,
        method: webReq.method,
        headers: {}
    };

    if (webReq.headers['x-requested-with'] != undefined) {
        options.headers['X-Requested-With'] = webReq.headers['x-requested-with'];
    }
    if (webReq.headers['accept'] != undefined) {
        options.headers['Accept'] = webReq.headers['accept'];
    }
    if (webReq.headers['cookie'] != undefined) {
        options.headers['Cookie'] = webReq.headers['cookie'];
    }

    let req = https.request(options, resp => {
        body = new stream();
        if (resp.headers['set-cookie'] != undefined) {
            let cookie = resp.headers['set-cookie'][0];
            webResp.setHeader('Set-Cookie', cookie);
        }
        webResp.setHeader('Connection', 'Keep-Alive');
        resp.on('data', data => body.push(data));
        resp.on('end', () => webResp.end(body.read()));
    });
    req.on('error', err => console.log(err));
    req.write(xml, 'utf8');
    req.end();
}

https.createServer(credentials, (req, resp) => {

    if (req.url.startsWith(dynamic)) {
        let body = [];
        req.on('data', d => body.push(d));
        req.on('end', () => forwardRequest(req, resp, Buffer.concat(body).toString()));
    } else {
        let contentType = 'text/html';
        if (req.url.endsWith('.png')) {
            contentType = 'image/png';
        } else if (req.url.endsWith('.css')) {
            contentType = 'text/css';
        } else if (req.url.endsWith('.js')) {
            contentType = 'application/javascript';
        }
        resp.writeHead(200, {'Content-Type': contentType});
        let url = req.url.substring(1);
        if (url == '' || url == '/') {
            url = 'index.html';
        }
        let f = 'htdocs/' + url;
        try {
            let data = fs.readFileSync(f);
            resp.end(data);
        } catch (e) {
            console.log(e);
        }
    }
}).listen(3000);
