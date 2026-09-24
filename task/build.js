const { minify } = require('terser');
const fs = require('fs'); 

console.log("Start build .....");

if (!fs.existsSync("log")) fs.mkdirSync("log", { recursive: true });
if (!fs.existsSync("dist")) fs.mkdirSync("dist", { recursive: true });
if (!fs.existsSync("dist/js")) fs.mkdirSync("dist/js", { recursive: true });

const bundle = process.argv[2] === "--bundle";
const outputFile = bundle ? "dist/winbox.bundle.min.js" : "dist/js/winbox.min.js";

function build() {
    (async () => {
        try {
            const helperCode = fs.readFileSync('src/js/helper.js', 'utf8');
            const templateCode = fs.readFileSync('src/js/template.js', 'utf8');
            const winboxCode = fs.readFileSync('src/js/winbox.js', 'utf8');
            const webpackCode = fs.readFileSync('src/js/webpack.js', 'utf8');
            
            let code = helperCode + '\n' + templateCode + '\n' + winboxCode + '\n' + webpackCode;
            
            // Remove import statements
            code = code
                .replace(/import\s+template\s+from\s+["'][^"']+["'];?\s*/g, '')
                .replace(/import\s+\{[^}]*\\}\s+from\s+["'][^"']+["'];?\s*/g, '')
                .replace(/import\s+\w+\s+from\s+["'][^"']+["'];?\s*/g, '');
            
            // Convert the default-exported template function into a named function
            // declaration. We must NOT reuse the name "template" for the function
            // because template.js already declares `let template = null;` as the
            // lazy cache for the template DOM node. Reusing that name would (a)
            // cause a redeclaration error and (b) make the cache variable hold the
            // function itself, so the div is never created and cloneNode() is
            // called on a function -> TypeError. Renaming keeps the cache working.
            code = code.replace(/export default function\(/g, 'function wbTemplate(');
           
            // Update the only call site in winbox.js that invokes the template fn.
            code = code.replace(/this\.dom\s*=\s*template\s*\(/g, 'this.dom = wbTemplate(');
            
            // Handle export function - remove export keyword
            code = code.replace(/\bexport\s+function\s+/g, 'function ');
            code = code.replace(/\bexport\s+default\s+/g, '');
            code = code.replace(/;\s*export\s+default/g, ';');
            
            // Handle import WinBox from webpack.js - remove import and keep the assignment
            code = code.replace(/;import\s+WinBox\s+from\s+["'][^"']+["'];?\s*/g, ';');
            
            // At the end, add window.WinBox = WinBox for non-module usage
            // The last line of webpack.js is: window["WinBox"] = WinBox;
            // We need to ensure it stays
            
            console.log('Total code size:', code.length, 'bytes');
            
            const minifyOptions = {
                compress: { drop_console: false, drop_debugger: true, ecma: 2015 },
                mangle: { keep_fnames: true },
                output: { ecma: 5 }
            };
            
            console.log('Minifying...');
            const result = await minify(code, minifyOptions);
            
            if (result.error) {
                console.error('Minification error:', result.error);
                process.exit(1);
            }
            
            console.log('Minification complete');
            
            let build = result.code;
            let preserve = fs.readFileSync("src/js/winbox.js", "utf8");
            
            const package_json = require("../package.json");
            
            preserve = preserve.replace("* WinBox.js", "* WinBox.js v" + package_json.version + (bundle ? " (Bundle)" : ""));
            
            build = preserve.substring(0, preserve.indexOf('*/') + 2) + "\n" + build;
            
            fs.writeFileSync(outputFile, build);
            
            console.log("Build Complete.");
            console.log("Output:", outputFile);
            console.log("File size:", fs.statSync(outputFile).size, "bytes");
            
        } catch (error) {
            console.error('Build error:', error);
            process.exit(1);
        }
    })();
}

build();