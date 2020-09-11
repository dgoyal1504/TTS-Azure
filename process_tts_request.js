// index.js
const settings = require("../shared/settings");
const fetch = require('node-fetch');
// Text to speech
const xmlbuilder = require('xmlbuilder');
const rp = require('request-promise');

// MongoDB - CosmosDB
const createMongoClient = require('../shared/mongo');
const { ObjectID } = require('mongodb');

// Blob Storage
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function(context, mySbMsg) {
    context.log('JavaScript ServiceBus queue trigger function processed message', mySbMsg)
    const postId = mySbMsg["id"]
    context.log('postId is ', ObjectID(postId) )
    const filter = postId == "*" ? {} : { "_id" : ObjectID(postId)}
    const { db, connection } = await createMongoClient()    //var mongoClient = require("mongodb").MongoClient;
    // Search post in DB 
    const Posts = db.collection('posts') //tts-demo (CosmosDB)->tts-> posts[]
    const res = await Posts.find(filter)
    const body = await res.toArray()
    //console.log(body)
    const text = body[0]["text"]
    console.log("text is :", text)

    try {
        // Invoke Text to speech API
        // Get Access Token - Do we need to get it again and again?
        const accessToken = await getAccessToken();
        //console.log("Got token");    
        // call text to Speech
        voiceStream =  await textToSpeech(accessToken, text);
        console.log("Conversion done");
        //console.log("voiceStream len, bytelength", Buffer.byteLength(voiceStream));

        // Storage response as blob
        //await storeAudio(voiceStream,postId);
        //console.log("Blob stored");

        // Update URL and status field in the DB entry
        const posts = await Posts.findOneAndUpdate(
          filter,
          { 
            $set : { 
              "status": "UPDATED",
              "url" : "url"
            }
          }
        ) 
        // Close DB connection
        connection.close()
        //console.log("Updated body is ", posts)
    } catch (err) {
        console.log(`Something went wrong: ${err}`);
        console.log(err);
    }

}
// Gets an access token.
function getAccessToken() {
    console.log(settings.issueTokenUri, " : ", settings.subscriptionKey)
    let options = {
        method: 'POST',
        uri: settings.issueTokenUri,
        headers: {
            'Ocp-Apim-Subscription-Key': settings.subscriptionKey
        }
    }
    return rp(options);
}
// Converts text to speech using the input from readline.
function textToSpeech(accessToken, text) {
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
    console.log("XML conversion over");
    var buf;// = Buffer();
    // Fetch
    let options = {
        // These properties are part of the Fetch Standard
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'cache-control': 'no-cache',
            'User-Agent': settings.cognitiveResource,
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
            'Content-Type': 'application/ssml+xml'
        },        // request headers. format is the identical to that accepted by the Headers constructor (see below)
        body: body,         // request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
    };
    fetch(settings.cognitiveUri + 'cognitiveservices/v1', options ) 
            .then(function(response) {
            //console.log("Response length is ", Buffer.byteLength(response.arrayBuffer()));    
            return response.arrayBuffer();
        }).then(function(buffer) {
            //buffer.copy(buf);
            //console.log("Buffer len, bytelength", buffer.length, ",", typeof(buffer), ",", Buffer.byteLength(buffer));
            //buffer.copy(buf);
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
                const blobName = 'complex.mp3';
                
                // Get a block blob client
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                blockBlobClient.upload(buffer);
            /*
            audioCtx.decodeAudioData(buffer, function(decodedData) {
            source.buffer = decodedData;
            source.connect(audioCtx.destination);
            });
            */
        });
        return buf;
    /*
    let options = {
        method: 'POST',
        baseUrl: settings.cognitiveUri,
        url: 'cognitiveservices/v1',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'cache-control': 'no-cache',
            'User-Agent': settings.cognitiveResource,
            'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
            'Content-Type': 'application/ssml+xml'
        },
        body: body
    }

    let request = rp(options)
        .on('response', (response) => {
            if (response.statusCode === 200) {
                //request.pipe(fs.createWriteStream('TTSOutput.wav'));
                //storeAudio(request.pipe,"5678");
                console.log("REquest object:", request);
                console.log('\nYour file is ready.\n');
            }
        });
    */
    //return request;

};
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