const fs = require('fs');
const path = require('path');
const { optimize } = require('svgo');

const directoryPath = 'dist/img';
const files = fs.readdirSync(directoryPath);

const svgoOptions = {
    plugins: [
        'preset-default'
    ]
};

files.forEach(function(filepath) {

    if(filepath.endsWith(".svg")) {

        const fullPath = path.resolve(__dirname, "../", directoryPath, filepath);

        console.log(fullPath);

        const data = fs.readFileSync(fullPath, 'utf8');
        const result = optimize(data, svgoOptions);

        fs.writeFileSync(fullPath, result.data);
    }
});

console.log("SVG optimization complete.");