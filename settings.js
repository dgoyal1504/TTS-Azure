// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

(function() {
"use strict";
  
  module.exports = {
  
    // Replace with your own subscription key, service region (e.g., "westus"),
    // and recognition language.
    subscriptionKey:   "3148f942968d40139e723f8a0fb48083",
    serviceRegion:     "eastus", // e.g., "westus"
    language:          "en-US",
    issueTokenUri: 'https://eastus.api.cognitive.microsoft.com/sts/v1.0/issuetoken',
    cognitiveUri: 'https://eastus.tts.speech.microsoft.com/',
    cognitiveResource: 'resourceTts',
    // Replace with the full path to a wav file you want to recognize or overwrite.
    filename:          "YourAudioFile.wav", // 16000 Hz, Mono
    // Storage
    storageAccount: "sg001tts",
    storageKey: "sN/W94HP5Gp0JwBJ9LutXBRUW5JPud8cD1PTnL4xsfY30GeIULu9afacishzxWRTs9Jkwm41frEirTNf5d8heg==",
    storageConnectionString: "DefaultEndpointsProtocol=https;AccountName=sg001tts;AccountKey=sN/W94HP5Gp0JwBJ9LutXBRUW5JPud8cD1PTnL4xsfY30GeIULu9afacishzxWRTs9Jkwm41frEirTNf5d8heg==;EndpointSuffix=core.windows.net",
    audioContainer: "tts-audio-files",
    // Replace with your own Language Understanding subscription key (endpoint
    // key), region, and app ID in case you want to run the intent sample.
    luSubscriptionKey:     "3148f942968d40139e723f8a0fb48083",
    luServiceRegion:   "eastus",
    luAppId:           "f8db6dc6-55da-4d0f-8a23-7447bd493b14"
    };
  }());