const fs = require('fs');
const path = require('path');
const server = require('http').createServer();

const PORT = Number.parseInt(process.env.PORT || '9001');

const dockerized = process.argv.length === 4 && process.argv[3] === 'dockerized';

if (!dockerized && process.argv.length < 3) {
    console.error('Missing argument: directory');
    process.exit(-1);
}

const directory = dockerized ? '/data' : process.argv[2];
if (!fs.existsSync(directory)) {
    console.error('Directory not exists', directory);
    process.exit(-1);
}

const listener = (req, res) => {
    const filename = path.resolve(path.join(directory, req.url));
    const host = req.headers['host'];
    console.log(directory, req.url, filename, host);

    if (!fs.existsSync(filename)) {
        res.writeHead(404, {ContentType: 'text/html'});
        res.end('Not Found');
        return;
    }

    const stat = fs.statSync(filename);

    if (stat.isDirectory()) {
        const splitUrl = req.url.split('/');
        const parentIsRoot = !!splitUrl.filter(Boolean).length;
        const parentDirectory = splitUrl.slice(undefined, splitUrl.length - 1);
        const mappedFiles = fs.readdirSync(filename)
            .map(f => ({
                name: f,
                path: filename === directory ? `/${f}` : `${req.url}/${f}`
            }));
        const files = parentIsRoot ? [{
            name: '..',
            path: parentDirectory.join('/')
        }].concat(...mappedFiles) : mappedFiles;
        const response = files.map(f => `<a href="//${host}${f.path}">${f.name}</a>`).join('<br />');
        res.writeHead(200, {ContentType: 'text/html'});
        res.end(response);
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': filename.split('/').pop()
    });
    fs.createReadStream(filename).pipe(res);
};

server.on('request', listener);

server.listen(PORT, (err) => {
    !err && console.log(`listening on ${PORT}`);
});
