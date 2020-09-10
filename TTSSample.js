// TTSSample.js
// Converts given text to Audio and uploads to Azure Blob storage
// Ultimately to be used in an Azure function
// As of now input text as well as the target BLobStorage object are hard coded.

// To install dependencies, run: npm install
const xmlbuilder = require('xmlbuilder');
// request-promise has a dependency on request
const rp = require('request-promise');
const fs = require('fs');
const readline = require('readline-sync');
const settings = require('./settings.js');

const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({ storage: inMemoryStorage }).single('image');
const getStream = require('into-stream');

const ONE_MEGABYTE = 1024 * 1024;
const uploadOptions = { bufferSize: 4 * ONE_MEGABYTE, maxBuffers: 20 };
const ONE_MINUTE = 60 * 1000;
// Blob Storage
const { BlobServiceClient } = require('@azure/storage-blob');

// Gets an access token.
function getAccessToken(subscriptionKey) {
    let options = {
        method: 'POST',
        uri: settings.issueTokenUri,
        headers: {
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    }
    return rp(options);
}

// Converts text to speech using the input from readline.
function textToSpeech(accessToken, text, writeableStream) {
    // Create the SSML request.
    let xml_body = xmlbuilder.create('speak')
        .att('version', '1.0')
        .att('xml:lang', 'en-us')
        .ele('voice')
        .att('xml:lang', 'en-us')
        .att('name', 'en-US-Guy24kRUS') // Short name for 'Microsoft Server Speech Text to Speech Voice (en-US, Guy24KRUS)'
        .txt(text)
        .end();
    // Convert the XML into a string to send in the TTS request.
    let body = xml_body.toString();
    //console.log("xml string is done");
    let options = {
        method: 'POST',
        baseUrl: settings.cognitiveUri,
        url: 'cognitiveservices/v1',
        headers: {
            'Authorization': 'Bearer ' + accessToken, 
            'cache-control': 'no-cache',
            'User-Agent': settings.cognitiveResource,
            'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm',
            'Content-Type': 'application/ssml+xml'
        },
        body: body
    }
    console.log(options);
    let request = rp(options)
        .pipe(writeableStream)
        .on("finish", async () => {
     //   .on('response', async (response) =>  {
  //          if (response.statusCode === 200) {}
                console.log("Inside response");
  //              const stream = getStream(response);
                //request.pipe(fs.createWriteStream('TTSOutput.wav'));

                const AZURE_STORAGE_CONNECTION_STRING = settings.storageConnectionString;
                const storageAccount = settings.storageAccount;
                const storageKey = settings.storageKey;
                const containerName = settings.audioContainer;
                // Create the BlobServiceClient object which will be used to create a container client
                const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
                
                // Get a reference to a container
                const containerClient = blobServiceClient.getContainerClient(containerName);
                
                // Create a unique name for the blob
                //const blobName = id + '.mp3';
                const blobName = 'audio1.mp3';
                
                // Get a block blob client
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                //blockBlobClient.upload(buffer,61000);
                //blockBlobClient.upload(request.body);
                try {
                     await blockBlobClient.uploadStream(writeableStream,
                      uploadOptions.bufferSize, uploadOptions.maxBuffers,
                      { blobHTTPHeaders: { blobContentType: "audio/mpeg3" } });
                    //res.render('success', { message: 'File uploaded to Azure Blob storage.' });
                    console.log('Success');
                  } catch (err) {
                    //res.render('error', { message: err.message });
                    console.log("Failure", err.stack);
                  }
                console.log("I am done");
//            }
        });
    return request;

};

// Use async and await to get the token before attempting
// to convert text to speech.
async function main() {
    const subscriptionKey = settings.subscriptionKey; //process.env.SPEECH_SERVICE_KEY;
    if (!subscriptionKey) {
        throw new Error('Environment variable for your subscription key is not set.')
    };
    // Prompts the user to input text.
    //const text = readline.question('What would you like to convert to speech? ');
    const text = "Hello there";
    try {
        const accessToken = await getAccessToken(subscriptionKey);
        //console.log("Access Token is done");
        await textToSpeech(accessToken, text);
    } catch (err) {
        console.log(`Something went wrong: ${err}`);
        console.log(err.stack);
    }
}

// Run the application
main()

// storeAudio function - not used as of now. 

function storeAudio(voiceStream,id) {
    const AZURE_STORAGE_CONNECTION_STRING = settings.storageConnectionString;
    const storageAccount = settings.storageAccount;
    const storageKey = settings.storageKey;
    const containerName = settings.audioContainer;
    // Create the BlobServiceClient object which will be used to create a container client
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    
    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create a unique name for the blob
    const blobName = id + '.mp3';
    
    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    console.log('\nUploading to Azure storage as blob:\n\t', blobName);
    
    // Upload data to the blob
    const data = voiceStream;  //This should be a stream
    const uploadBlobResponse = blockBlobClient.upload(data);
    console.log("Blob was uploaded successfully. requestId: ", uploadBlobResponse.requestId);
}
