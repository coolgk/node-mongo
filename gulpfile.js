'use strict';

const gulp = require('gulp');
const ts = require('gulp-typescript');
// const sourcemaps = require('gulp-sourcemaps');
const fs = require('fs');
// const path = require('path');
// const yaml = require('js-yaml');
// const jsdoc2md = require('jsdoc-to-markdown');
const chalk = require('chalk');
const del = require('del');
const header = require('gulp-header');

const packageJsonFile = require('./package.json');

const codeHeader = `/*!
 * @package ${packageJsonFile.name}
 * @version ${packageJsonFile.version}
 * @link ${packageJsonFile.homepage}
 * @license ${packageJsonFile.license}
 * @author ${packageJsonFile.author}
 */

`;

gulp.task('package', () => generatePackage({
    distFolder: 'dist',
    packageFolder: 'package',
    sourceFolder: 'src',
    fileHeader: codeHeader,
    excludedFiles: ['index', 'test', 'globals.d', 'examples'],
    sourceReadme: './README.BASE.md',
    targetReadme: './README.md',
    packageJson: packageJsonFile,
    packageJsonOverride: {
        // 'name': '@coolgk/mvc',
        'devDependencies': undefined,
        'scripts': undefined,
        'pre-commit': undefined,
        'repository': {
            type: 'git',
            url: 'https://github.com/coolgk/mongo.git'
        }
    }
}));

gulp.task('publish', ['package'], () => {
    return execCommand(`cd package && npm publish --access=public`);
});

// gulp.task('cover', addTestCoverage);

async function generatePackage ({
    distFolder, packageFolder, fileHeader, excludedFiles, sourceReadme, targetReadme, packageJson, sourceFolder, packageJsonOverride
}) {
    // del /package folder
    await del([`${distFolder}/**`, `${packageFolder}/**`]);
    // create /package folder
    await createFolder(packageFolder);
    // generate md for jsdoc from all .ts files
    // const jsDocs = await generateJsDocMd(sourceFolder, distFolder, fileHeader, excludedFiles);
    // recreate root README.md with README.BASE.md + jsdoc
    const testCoverage = await createTestCoverage();
    // cp README.md to /package
    // await createReadme(jsDocs, sourceReadme, targetReadme, packageFolder, packageJson);
    await createReadme(testCoverage, sourceReadme, targetReadme, packageFolder, packageJson);
    // generate index.ts
    // await generateIndexFile(sourceFolder, excludedFiles);
    // compile ts
    await compileTs(sourceFolder, distFolder, fileHeader);
    // cp complied .js and d.ts files from dist/ to package/
    await copyFilesToPackage(distFolder, packageFolder);
    // cp simplified package.json to package/
    await createPackageJson(packageFolder, packageJson, packageJsonOverride);
    // cp licence file
    await createLicence(packageFolder);
}

function createFolder (path) {
    return new Promise((resolve, reject) => {
        fs.mkdir(path, (error) => {
            if (error && error.code !== 'EEXIST') return reject(error);
            resolve();
        });
    });
}

function compileTs (sourceFolder, distFolder, fileHeader, dev) {
    let tsResult = gulp.src(sourceFolder + '/*.ts');

    // if (dev) {
    //     tsResult = tsResult.pipe(sourcemaps.init());
    // }

    tsResult = tsResult.pipe(
        ts.createProject('./tsconfig.json', { removeComments: !dev })()
    );

    const promises = [];

    // if (dev) {
    //     tsResult.js = tsResult.js
    //         .pipe(sourcemaps.write())
    //         .pipe(header('require("source-map-support").install();' + "\n")); // eslint-disable-line
    // } else {
    if (!dev) {
        tsResult.js = tsResult.js.pipe(header(fileHeader));
        promises.push(
            new Promise((resolve) => {
                tsResult.dts
                    .pipe(header(fileHeader))
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

/* async function generateJsDocMd (sourceFolder, distFolder, fileHeader, excludedFiles) {
    await compileTs(sourceFolder, distFolder, fileHeader, true);

    return new Promise((resolve) => {
        fs.readdir('src', async (error, files) => {
            let jsDocs = '';

            for (const file of files) {
                const name = file.replace('.ts', '');
                if (!excludedFiles.includes(name)) {
                    jsDocs += await jsdoc2md.render({ files: `${distFolder}/${name}.js` });
                }
            }

            resolve(jsDocs);
        });
    });
} */

function createReadme (jsDoc, sourceReadme, targetReadme, packageFolder, packageJson) {
    return new Promise((resolve, reject) => {
        fs.readFile(sourceReadme, 'utf8', (error, data) => {
            if (error) reject(error);
            let content = data;
            if (packageJson.bugs && packageJson.bugs.url) {
                content += `\n\nReport bugs here: [${packageJson.bugs.url}](${packageJson.bugs.url})\n\n`;
            }
            content += jsDoc;
            fs.writeFile(targetReadme, content, 'utf8', (error) => {
                if (error) return reject(error);
                fs.createReadStream(targetReadme).pipe(
                    fs.createWriteStream(`${packageFolder}/README.md`)
                ).on('finish', () => resolve()).on('error', reject);
            });
        });
    });
}

// function generateIndexFile (sourceFolder, excludedFiles) {
//     return new Promise((resolve) => {
//         const writeStream = fs.createWriteStream(sourceFolder + '/index.ts');
//         fs.readdir(sourceFolder, (error, files) => {
//             files.forEach((file) => {
//                 const filename = file.replace('.ts', '');
//                 if (!excludedFiles.includes(filename)) {
//                     writeStream.write(`import * as _${filename} from './${filename}';\n`);
//                     writeStream.write(`export const ${filename} = _${filename}; // tslint:disable-line\n`);
//                 }
//             });
//             writeStream.end();
//             resolve();
//         });
//     });
// }

function copyFilesToPackage (distFolder, packageFolder) {
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

function createPackageJson (packageFolder, packageJson, packageJsonOverride) {
    return new Promise((resolve, reject) => {
        fs.writeFile(
            `${packageFolder}/package.json`,
            JSON.stringify(
                Object.assign(
                    packageJson,
                    packageJsonOverride
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

function createLicence (packageFolder) {
    return new Promise((resolve, reject) => {
        fs.createReadStream('./LICENSE').pipe(
            fs.createWriteStream(`${packageFolder}/LICENSE`)
        ).on('finish', resolve).on('error', reject);
    });
}

async function createTestCoverage () {
    return '```' + await execCommand('node_modules/nyc/bin/nyc.js report --reporter=text-summary', { mute: true }) + '```';
}

function consoleLogError (message) {
    console.error(chalk.white.bgRed.bold(message));
}

function execCommand (command, options = { mute: false }) {
    return new Promise((resolve, reject) => {
        if (!options.mute) console.log('exec command: ' + command); // eslint-disable-line
        require('child_process').exec(command, { maxBuffer: Infinity }, (error, stdout, stderr) => {
            if (!options.mute) console.log(stdout); // eslint-disable-line
            consoleLogError(stderr);
            if (error) {
                reject(error);
            } else {
                if (!options.mute) console.log('done'); // eslint-disable-line
                resolve(stdout);
            }
        });
    });
}

process.on('unhandledRejection', consoleLogError);
