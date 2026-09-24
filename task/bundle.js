const fs = require('fs');
const path = require('path');

fs.existsSync("log") || fs.mkdirSync("log");
fs.existsSync("tmp") || fs.mkdirSync("tmp");
fs.existsSync("dist") || fs.mkdirSync("dist");
fs.existsSync("dist/js") || fs.mkdirSync("dist/js");

const image = process.argv[2] === "--image";
const style = process.argv[2] === "--style";
const mimeTypes = {
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'ico': 'image/x-icon',
    'webp': 'image/webp'
};

/**
 * Convert image file to base64 data URI
 * @param {string} filePath - Path to the image file
 * @returns {string} - Base64 data URI
 */
function toBase64(filePath) {
    const data = fs.readFileSync(filePath);
    const base64 = data.toString('base64');
    const extname = path.extname(filePath).toLowerCase().substring(1) || 'png';         
    const mime = mimeTypes[extname] || `image/${extname}`;
    return `data:${mime};base64,${base64}`;
}

(function(){

    if(image){

        // TODO provide custom filenames

        const compressed = {
            max: toBase64('dist/img/max.svg'),
            close: toBase64('dist/img/close.svg'),
            full: toBase64('dist/img/full.svg'),
            //exit: toBase64('dist/img/exit.svg'),
            //restore: toBase64('dist/img/restore.svg'),
            min: toBase64('dist/img/min.svg')
        };

        let tmp = "";

        for(let key in compressed){

            if(compressed.hasOwnProperty(key)){

                tmp += ("@" + key + ": \"" + compressed[key] + "\";\n");
            }
        }

        fs.writeFileSync("tmp/images.less", tmp);
        fs.writeFileSync("tmp/bundle.less", '@import "../src/css/winbox.less"; @import "images.less";');
    }

    // ----------------------

    if(style && fs.existsSync("dist/css/winbox.min.css")) {

        const cssContent = fs.readFileSync("dist/css/winbox.min.css", "utf8");
        const cssEscaped = cssContent.replace(/"/g, "'");
        
        fs.writeFileSync("tmp/style.js",
            'const style = document.createElement("style");' +
            'style.innerHTML = "' + cssEscaped + '";' +
            'const head = document.getElementsByTagName("head")[0];' +
            'if(head.firstChild) head.insertBefore(style, head.firstChild); else head.appendChild(style);'
        );
    }

})();