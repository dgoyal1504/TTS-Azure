const xmlbuilder = require("xmlbuilder");
const rp = require("request-promise");
const azure = require("azure-storage");
const subscriptionKey = "3148f942968d40139e723f8a0fb48083";



function getAccessToken(subscriptionKey) {
  let options = {
    method: "POST",
    uri: 'https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
    headers: {
      "Ocp-Apim-Subscription-Key": subscriptionKey,
    },
  };
  return rp(options);
}

// Converts text to speech using the input from readline.
function textToSpeech(accessToken, text, writableStream) {
  return new Promise((resolve, reject) => {
    try {
      let xml_body = xmlbuilder
        .create("speak")
        .att("version", "1.0")
        .att("xml:lang", "en-us")
        .ele("voice")
        .att("xml:lang", "en-us")
        .att("name", "en-US-Guy24kRUS")
        .txt(text)
        .end();
      // Convert the XML into a string to send in the TTS request.
      let body = xml_body.toString();

      let options = {
        method: "POST",
        baseUrl: "https://eastus.tts.speech.microsoft.com/",
        url: "cognitiveservices/v1",
        headers: {
          Authorization: "Bearer " + accessToken,
          "cache-control": "no-cache",
          "User-Agent": "YOUR_RESOURCE_NAME",
          "X-Microsoft-OutputFormat": "audio-16khz-64kbitrate-mono-mp3",
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

//module.exports = async function (context, req) {
    async function main() {

        console.log("JavaScript HTTP trigger function processed a request.");
        try {
          const accessToken = await getAccessToken(subscriptionKey);
      
          const blobService = azure.createBlobService(
              "DefaultEndpointsProtocol=https;AccountName=sg001tts;AccountKey=sN/W94HP5Gp0JwBJ9LutXBRUW5JPud8cD1PTnL4xsfY30GeIULu9afacishzxWRTs9Jkwm41frEirTNf5d8heg==;EndpointSuffix=core.windows.net",
          );
          const writableStream = blobService.createWriteStreamToBlockBlob(
            "tts-audio-files",
            "test1.mp3",
            {
              blockIdPrefix: "block",
              contentSettings: {
                contentType: "audio/mpeg",
              },
            },
          );
          
          const text = "Hello";
          const data = await textToSpeech(accessToken, text, writableStream);
      
          //context.res = { body: data };
        } catch (err) {
          console.log('Something went wrong: ', err);
          console.log(err.stack);
          /*context.res = {
            status: 500,
            body: err,
          };*/
        }
      };
      main()