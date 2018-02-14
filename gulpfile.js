'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');
const sourcemaps = require('gulp-sourcemaps');
const fs = require('fs');
// const path = require('path');
// const yaml = require('js-yaml');
const jsdoc2md = require('jsdoc-to-markdown');
const chalk = require('chalk');
const del = require('del');
const header = require('gulp-header');

const childProcess = require('child_process');


const packageJson = require('./package.json');

const distFolder = 'dist';
const packageFolder = 'package';

const codeHeader = `/*!
 * @package ${packageJson.name}
 * @version ${packageJson.version}
 * @link ${packageJson.homepage}
 * @license ${packageJson.license}
 */

`;

gulp.task('package', generatePackage);

gulp.task('publish', ['package'], () => {
    return execCommand(`cd ${packageFolder} && npm publish --access=public`);
});

async function generatePackage () {
    // del /package folder
    await del([`${distFolder}/**`, `${packageFolder}/**`]);
    // create /package folder
    await createFolder(packageFolder);
    // generate md for jsdoc from all .ts files
    const jsDocs = await generateJsDocMd();
    // recreate root README.md with README.BASE.md + jsdoc
    // cp README.md to /package
    await createReadme(jsDocs);
    // generate index.ts
    await generateIndexFile();
    // compile ts
    await compileTs();
    // cp complied .js and d.ts files from dist/ to package/
    await copyFilesToPackage();
    // cp simplified package.json to package/
    await createPackageJson();
}

function createFolder (path) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, (error) => {
            if (error && error.code !== 'EEXIST') return reject(error);
            resolve();
        });
    });
}

function compileTs (dev) {
    let tsResult = gulp.src('src/*.ts');

    if (dev) {
        tsResult = tsResult.pipe(sourcemaps.init());
    }

    tsResult = tsResult.pipe(
        ts.createProject('./tsconfig.json', { removeComments: !dev })()
    );

    const promises = [];

    if (dev) {
        tsResult.js = tsResult.js
            .pipe(sourcemaps.write())
            .pipe(header('require("source-map-support").install();' + "\n")); // eslint-disable-line
    } else {
        tsResult.js = tsResult.js.pipe(header(codeHeader));
        promises.push(
            new Promise((resolve) => {
                tsResult.dts
                    .pipe(header(codeHeader))
                    .pipe(gulp.dest(distFolder))
                    .on('finish', () => resolve());
            })
        );
    }

    promises.push(
        new Promise((resolve) => {
            tsResult.js.pipe(gulp.dest(distFolder)).on('finish', () => resolve());
        })
    );

    return Promise.all(promises);
}

async function generateJsDocMd () {
    await compileTs(true);

    return new Promise((resolve) => {
        fs.readdir('src', async (error, files) => {
            let jsDocs = '';

            for (const file of files) {
                const name = file.replace('.ts', '');
                if (!['index', 'test', 'globals.d', 'examples'].includes(name)) {
                    jsDocs += await jsdoc2md.render({ files: `${distFolder}/${name}.js` });
                }
            }

            resolve(jsDocs);
        });
    });
}

function createReadme (jsDoc) {
    return new Promise((resolve, reject) => {
        fs.readFile('./README.BASE.md', 'utf8', (error, data) => {
            if (error) reject(error);
            const bugLine = `Report bugs here: [${packageJson.bugs.url}](${packageJson.bugs.url})`;
            fs.writeFile(`./README.md`, `${data}\n\n${bugLine}\n\n${jsDoc}`, 'utf8', (error) => {
                if (error) return reject(error);
                fs.createReadStream(`./README.md`).pipe(
                    fs.createWriteStream(`${packageFolder}/README.md`)
                ).on('finish', () => resolve()).on('error', reject);
            });
        });
    });
}

function generateIndexFile () {
    return new Promise((resolve) => {
        const writeStream = fs.createWriteStream('src/index.ts');
        fs.readdir('src', (error, files) => {
            files.forEach((file) => {
                const filename = file.replace('.ts', '');
                if (!['index', 'test', 'globals.d', 'examples'].includes(filename)) {
                    writeStream.write(`import * as _${filename} from './${filename}';\n`);
                    writeStream.write(`export const ${filename} = _${filename}; // tslint:disable-line\n`);
                }
            });
            writeStream.end();
            resolve();
        });
    });
}

function copyFilesToPackage () {
    return new Promise((resolve, reject) => {
        fs.readdir(distFolder, (error, files) => {
            const promises = [];
            files.forEach((file) => {
                promises.push(new Promise((resolve) => {
                    fs.createReadStream(`${distFolder}/${file}`).pipe(
                        fs.createWriteStream(`${packageFolder}/${file}`)
                    ).on('finish', resolve).on('error', reject);
                }));
            });
            resolve(Promise.all(promises));
        });
    });
}

function createPackageJson () {
    return new Promise((resolve, reject) => {
        fs.writeFile(
            `${packageFolder}/package.json`,
            JSON.stringify(
                Object.assign(
                    packageJson,
                    {
                        'name': '@coolgk/mvc',
                        'devDependencies': undefined,
                        'scripts': undefined,
                        'pre-commit': undefined
                    }
                )
            ),
            'utf8',
            (error) => {
                if (error) return reject(error);
                resolve();
            }
        );
    });
}

function consoleLogError (message) {
    console.error(chalk.white.bgRed.bold(message));
}

function execCommand (command, options = { mute: false }) {
    return new Promise((resolve, reject) => {
        if (!options.mute) console.log('exec command: ' + command); // eslint-disable-line
        childProcess.exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
            if (!options.mute) console.log(stdout); // eslint-disable-line
            consoleLogError(stderr);
            if (error) {
                reject(error);
            } else {
                if (!options.mute) console.log('done'); // eslint-disable-line
                resolve();
            }
        });
    });
}

process.on('unhandledRejection', consoleLogError);
