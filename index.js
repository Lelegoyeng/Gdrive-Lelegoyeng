const inquirer = require('inquirer');
const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const directoryPath = path.join(__dirname, 'upload');
const FormatMimeTypes = require('./mimetypes')
const KEY = './key.json'
const SCOPE = ['https://www.googleapis.com/auth/drive',]
const FolderParents = '1kyRRnfgeKgHvh6D33v1fFw1Srfn_jWlS'
const auth = new google.auth.GoogleAuth({
    keyFile: KEY,
    scopes: SCOPE
})

async function index() {
    return new Promise(async resolve => {
        inquirer
            .prompt([
                {
                    type: 'list',
                    name: 'operation',
                    message: 'What do you want?',
                    choices: ['Get List Drive', 'List File Can Upload', 'Upload', 'Download', 'Delete'],
                },
            ])
            .then(async answers => {
                console.info('Answer:', answers.operation);
                if (answers.operation === 'Get List Drive') {
                    Folder(auth)
                }
                if (answers.operation === 'List File Can Upload') {
                    ListFileCanUpload()
                }
                if (answers.operation === 'Upload') {
                    Upload(auth)
                }
                if (answers.operation === 'Download') {
                    ItemListDownload(auth)
                }
                if (answers.operation === 'Delete') {
                    Delete(auth)
                }
            });
        resolve();
    });
}

index()


async function Folder(auth) {
    const drive = google.drive({ version: 'v3', auth: auth });
    const files = [];
    try {
        const res = await drive.files.list({
            q: '\'1kyRRnfgeKgHvh6D33v1fFw1Srfn_jWlS\' in parents',
            fields: 'nextPageToken, files(id, name, mimeType)',
        });
        Array.prototype.push.apply(files, res.files);
        res.data.files.forEach(function (file) {
            console.log('Found file:', file.name, file.id, file.mimeType);
        });
        return res.data.files;
    } catch (err) {
        console.log(err)
        throw err;
    }
}

async function ListFileCanUpload() {
    fs.readdir(directoryPath, async function (err, files) {
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        let listfile = []

        files.forEach(async function (file) {
            listfile.push({
                nama: file,
                type: file.split('.').slice(-1).toString()
            })
        });
        let data = JSON.stringify(listfile);
        fs.writeFileSync('filecanupload.json', data);
        console.log(listfile)
    });
}

async function Upload(auth) {
    inquirer
        .prompt([
            {
                name: 'FileNama',
                message: 'Upload File from Nama',
                default: 'kevinFileNama'
            },
        ])
        .then(async (answers) => {
            let Source = fs.readFileSync('filecanupload.json');
            let BacaFileNama = JSON.parse(Source);
            const checkFile = BacaFileNama.map(get => {
                return get
            }).filter(fill => fill.nama == `${answers.FileNama}`)

            if (checkFile) {
                const driveService = google.drive({ version: 'v3', auth })


                let namaFiles = checkFile.map(get => { return get.nama }).toString()

                let FixNameFiles = namaFiles.split('.')
                FixNameFiles.pop()

                const MimeTypes = FormatMimeTypes.AllMimeType.map(get => {
                    return get
                }).filter(fil => fil.ekstension === `${checkFile.map(get => { return get.type })}`)

                let media = {
                    mimeType: `${MimeTypes.map(get => { return get.mimetype })}`,
                    body: fs.createReadStream(`./upload/${checkFile.map(get => { return get.nama })}`)
                }

                let fileMetaData = {
                    'name': FixNameFiles,
                    'parents': [FolderParents]
                }
                let response = await driveService.files.create({
                    resource: fileMetaData,
                    media: media,
                    fields: 'id'
                })

                switch (response.status) {
                    case 200:
                        console.log('File Created id:', response.data.id)
                        console.log('Uploaded Finish...')

                        break;
                    default:
                        console.error('Error Connecting File', response.erros)
                }

            } else {
                console.log('File name not found!')
            }
        });
}

async function ItemListDownload() {
    inquirer
        .prompt([
            {
                name: 'fileId',
                message: 'Download File from ID',
                default: 'KevinFileId'
            },
        ])
        .then(async (answers) => {
            const drive = google.drive({ version: 'v3', auth });
            const files = [];
            const res = await drive.files.list({
                q: `\'${FolderParents}\' in parents`,
                fields: 'nextPageToken, files(id, name, mimeType)',
            });
            Array.prototype.push.apply(files, res.files);
            const check1 = res.data.files.map(get => {
                return get
            }).filter(fil => fil.id === answers.fileId)

            const MimeTypes = FormatMimeTypes.AllMimeType.map(get => {
                return get
            }).filter(fil => fil.mimetype === `${check1.map(get => { return get.mimeType })}`)

            const fileWrite = fs.createWriteStream('./download/' +
                `${check1.map(get => { return get.name })}.${MimeTypes.map(get => { return get.ekstension })}`);
            fileWrite.on('finish', function () {
                console.log('Download Done..');
            });

            try {
                const file = await drive.files.get({
                    fileId: answers.fileId,
                    alt: 'media',
                }, {
                    responseType: 'stream'

                },
                    (err, res) => {
                        if (err) {
                            throw err;
                        }

                        if (res) {
                            res.data
                                .on('end', () => {
                                    console.log('Starting Download...');
                                })
                                .on('error', (err) => {
                                    console.log('Error', err);
                                })
                                .pipe(fileWrite);
                        }
                    }

                );
            } catch (err) {
                console.log(err)
                throw err;
            }
        });
}


async function Delete(auth) {
    inquirer
        .prompt([
            {
                name: 'FileID',
                message: 'Delete File from FileID',
                default: 'kevinFileId'
            },
        ])
        .then(async (answers) => {
            const drive = google.drive({ version: 'v3', auth: auth });
            drive.files.delete({
                fileId: '10IqRv7UWHg5wv2IFgrQtxvyEmG9Q8Yg7',
            })
                .then(
                    async function (response) {
                        console.log('File Deleted!')
                    },
                    function (err) {
                        console.log(err)
                    }
                );
            console.log(answers)

        });

}



