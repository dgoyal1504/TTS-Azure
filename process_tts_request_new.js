// index.js
const settings = require("../shared/settings");
const subscriptionKey = settings.subscriptionKey;
const fetch = require('node-fetch');
// Text to speech
const xmlbuilder = require('xmlbuilder');
const rp = require('request-promise');

// MongoDB - CosmosDB
const createMongoClient = require('../shared/mongo');
const { ObjectID } = require('mongodb');

// Blob Storage
const { BlobServiceClient } = require('@azure/storage-blob');
const azure = require("azure-storage");

function getAccessToken(subscriptionKey) {
    console.log("Getting access token", subscriptionKey);
    let options = {
      method: "POST",
      uri: settings.issueTokenUri,
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    };
    return rp(options);
  }
  
// Converts text to speech using the input from readline.
function textToSpeech(accessToken, text, writableStream) {
    return new Promise((resolve, reject) => {
        console.log("Entering TTS");
      try {
        let xml_body = xmlbuilder
          .create("speak")
          .att("version", "1.0")
          .att("xml:lang", settings.language)
          .ele("voice")
          .att("xml:lang", settings.language)
          .att("name", settings.voiceName)
          .txt(text)
          .end();
        // Convert the XML into a string to send in the TTS request.
        let body = xml_body.toString();
        console.log("XML created");
        let options = {
          method: "POST",
          baseUrl: settings.cognitiveUri,
          url: "cognitiveservices/v1",
          headers: {
            Authorization: "Bearer " + accessToken,
            "cache-control": "no-cache",
            "User-Agent": "YOUR_RESOURCE_NAME",
            "X-Microsoft-OutputFormat": settings.audioFormat,
            "Content-Type": "application/ssml+xml",
          },
          body: body,
        };
  
        rp(options)
          .pipe(writableStream)
          .on("finish", () => {
            resolve("done");
          });
      } catch (error) {
        reject(error);
      }
    });
  }

/* Service bus trigger
module.exports = async function(context, mySbMsg) {
    context.log('JavaScript ServiceBus queue trigger function processed message', mySbMsg)
    const postId = mySbMsg["id"]
    context.log('postId is ', ObjectID(postId) )

*/
async function main() {
    console.log("subscriptionKey:", subscriptionKey );
    const postId = "5f558684f8dd631df4b82d82";
    const filter = postId == "*" ? {} : { "_id" : ObjectID(postId)}
    const { db, connection } = await createMongoClient()    //var mongoClient = require("mongodb").MongoClient;
    // Search post in DB 
    const Posts = db.collection('posts') //tts-demo (CosmosDB)->tts-> posts[]
    const res = await Posts.find(filter)
    const body = await res.toArray()
    //console.log(body)
    const text = body[0]["text"];
    console.log("text is :", text)
    try {
        // Invoke Text to speech API
        const containerName = settings.audioContainer;
        const blobName = postId + ".mp3";
        console.log("Post ID ", postId);
        const accessToken = await getAccessToken(subscriptionKey);         // Get Access Token - Do we need to get it again and again?
        console.log("Got access token");
        const blobService = azure.createBlobService(settings.storageConnectionString);
        console.log("Created blob service");
        const writableStream = blobService.createWriteStreamToBlockBlob(
            containerName,
            blobName,
            {
              blockIdPrefix: "block",
              contentSettings: {
                contentType: "audio/mpeg",
              },
            },
        );
        console.log("write stream created");
        const data = await textToSpeech(accessToken, text, writableStream);             // callText to Speech
        //Generate Url
        console.log("TTS done created");

        var sharedAccessPolicy = {
            AccessPolicy: {
              Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
              Start: Date(),
              Expiry: new Date(new Date().getTime() + 2*86400000)
            },
          };
          console.log("shared access policy created");

          var sasToken = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
          var sasUrl = blobService.getUrl(containerName, blobName, sasToken);
          console.log("URI is", sasUrl);

        // Update URL and status field in the DB entry
        const posts = await Posts.findOneAndUpdate(
          filter,
          { 
            $set : { 
              "status": "UPDATED",
              "url" : sasUrl
            }
          }
        ) 
        connection.close()                          // Close DB connection
    } catch (err) {
        //console.log(`Something went wrong: ${err}`);
        console.log(err.stack);
        //console.log(err);
    }
}
main()