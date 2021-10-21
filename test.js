const decisionSpeech = require('./decisionSpeech');

async function main() {
    var result = await decisionSpeech.decisionSpeech("Do you dance")
    console.log(result);
    if (result == null) console.log("result is null")
    else console.log(JSON.stringify(result, null, 2))
}

main();