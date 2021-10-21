## Decision Speech

A simple program which does semantic analysis of a given sentence and determines if it is asking to make a decision (e.g. 'choose', 'dance', 'sing' etc.). If so it returns an object containing the main verb that is being asked to perform along with the objects of the main verb (options of the main verb). 

Notably, the program analyses the location and presence of specific words (e.g. 'or', 'Wh-' question words etc.). No machine learning is involved.

## Warning
Decision Speech is still beta

## Installation
Requires NodeJS installed
```bash
npm install
```

## Execution
```bash
const decisionSpeech = require('./decisionSpeech')
async function main() {
    var result = await decisionSpeech.decisionSpeech("Do you dance")
    console.log(result);
    //result.verb contains the main verb
    //result.object contains the options or objects of the main verb
    if (result == null) console.log("Not a decision speech")
    else console.log(JSON.stringify(result, null, 2))
}
main();
```