#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.argv[2] || (process.platform.startsWith('win') ? 80 : 8080);
const rootDir = path.join(__dirname, '..');

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = `.${parsedUrl.pathname}`;
    
    // Handle directory paths
    if (pathname === './') {
        pathname = './index.html';
    }
    
    // Check if path is a directory
    const stats = fs.existsSync(pathname) ? fs.statSync(pathname) : null;
    if (stats && stats.isDirectory()) {
        pathname += '/index.html';
    }
    
    const ext = path.parse(pathname).ext;
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(pathname, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('File Not Found: ' + pathname);
            return;
        }
        
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
    });
});

server.listen(port, () => {
    console.log('-----------------------------------------------------');
    console.log(`Server running at http://localhost:${port}/`);
    console.log('-----------------------------------------------------');
    console.log('Hit CTRL-C to stop the server...');
});

process.on('SIGINT', () => {
    server.close(() => {
        process.exit(0);
    });
});