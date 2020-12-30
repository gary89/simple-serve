const fs = require('fs');
const path = require('path');
const server = require('http').createServer();

const PORT = Number.parseInt(process.env.PORT || '9001');

const dockerized = process.argv.length === 4 && process.argv[3] === 'dockerized';

const KB = 1024, MB = KB * 1024, GB = MB * 1024;
const MAP = '&lt;DIR&gt;';
const page = `
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SimpleServe</title>
<style>
	body {
		display: flex;
		flex-direction: column;
		padding-bottom: 2em;
	}
	body > div {
	    align-items: center;
		display: flex;
		justify-content: space-between;
		padding-bottom: 0.5em;
	}
	body,
	body>div:nth-child(odd) {
	    background-color: #ddd;
	}
	body>div:nth-child(even) {
	    background-color: #ccc;
	}
	a {
		display: inline-block;
		max-width: 80%;
		padding-top: 0.5em;
		word-wrap: break-word;
	}
</style>
</head>
<body>`;

if (!dockerized && process.argv.length < 3) {
    console.error('Missing argument: directory');
    process.exit(-1);
}

const directory = dockerized ? '/data' : process.argv[2];
if (!fs.existsSync(directory)) {
    console.error('Directory not exists', directory);
    process.exit(-1);
}

const toFriendlySize = size =>
    size > GB ? `${(size / GB).toFixed(1)} GB` :
        size > MB ? `${(size / MB).toFixed(1)} MB` :
            size > KB ? `${(size / KB).toFixed(0)} KB` :
                `${size} B&nbsp;`;

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
            .map(f => {
                let fstat;
                try {
                    fstat = fs.statSync(path.join(filename, f));
                } catch (e) {
                    fstat = {isDirectory: () => false, size: -1};
                }
                return {
                    name: f,
                    path: filename === directory ? `/${f}` : `${req.url}/${f}`,
                    size: fstat.isDirectory() ? MAP : toFriendlySize(fstat.size)
                };
            });
        const files = parentIsRoot ? [{
            name: '..',
            path: parentDirectory.join('/'),
            size: MAP
        }].concat(...mappedFiles) : mappedFiles;
        files.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        const response = files.map(f =>
            `<div><a href="//${host}${f.path}">${f.name}</a><span>${f.size}</span></div>`
        ).join('\n');
        res.writeHead(200, {ContentType: 'text/html'});
        res.end(page + response + '</html>');
        return;
    }

    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': filename.split('/').pop(),
        'Content-Length': stat.size
    });
    fs.createReadStream(filename).pipe(res);
};

server.on('request', listener);

server.listen(PORT, (err) => {
    !err && console.log(`listening on ${PORT}`);
});
