// @ts-check
//substitute for the decision speech extractor for Robotic Intuition Operator
//Debashish Buragohain
const WordPOS = require('wordpos');
const wordpos = new WordPOS();
const verbList = require('./baseVerbs.json');
const decisionIndicators = require('./decisionIndicators.json');
const prepositionList = require('./prepositions.json');
const pronounList = require('./pronouns.json');
const compoundList = require('./compound-words.json');
/* following formats are supported
would you like to dance
will you dance
do you like to dance
will you dance now or later
will you dance with him or me
will you dance ballet or hip-hop
do you dance
will you dance with me
would you like to dance with me
do you like to dance with me
*/

async function main(givenSpeech) {
    var returnObj = {
        verbs: null,
        objects: null
    }
    if (givenSpeech.includes(" you ")) {
        //check if we have a decision indicator at the first part of the string
        let firstPartString = givenSpeech.slice(0, givenSpeech.indexOf('you')).toLowerCase();
        var includesDescisionInd = false;
        for (var x = 0; x < decisionIndicators.length; x++) {
            if (firstPartString.includes(decisionIndicators[x])) {
                //when it includes a decision indicator we remove the decision indicator so that it won't create confusion
                givenSpeech = givenSpeech.replace(decisionIndicators[x], "");
                includesDescisionInd = true;
                break;
            }
        }
        //if we have found our decision indicators, move on to the next steps
        if (includesDescisionInd == true) {
            //get the verbs in the sentence
            let wordArray = getArrayFromStr(givenSpeech)        //word array must be carried to a higher level
            let verbsDetected = new Array(0);
            verbList.forEach(el => {
                wordArray.forEach(element => {
                    if (el == element)
                        verbsDetected.push(el);
                })
            })
            //verbs in the sentence cannot be 0
            if (verbsDetected.length != 0) {
                let mainVerb = new Array(0);            //only the main verb will be required, everything after the main verb is a list of objects
                let objVerbs = new Array(0);            //object verbs will not be required in the current version of the program
                if (verbsDetected.length == 1) mainVerb = verbsDetected;
                //we find the main verb and the object verbs through this step
                else {
                    verbsDetected.forEach(el => {
                        let isObjectVerb = false;
                        const wordArrayIndex = getIndex(el, wordArray);
                        let wordBefore = wordArray[wordArrayIndex - 1];
                        for (var i = 0; i < prepositionList.length; i++) {
                            if (prepositionList[i] == wordBefore) {
                                isObjectVerb = true;
                                break;
                            }
                        }
                        if (isObjectVerb == true) objVerbs.push(el);
                        else mainVerb.push(el);
                    })
                    console.log("Main verb: ", mainVerb);
                    console.log("Object verbs: ", objVerbs);
                    //if we still have more than one main verb, then the former one is the main verb and the latter an object verb
                    if (mainVerb.length > 1) {
                        for (var i = 1; i < mainVerb.length; i++) {
                            objVerbs.push(mainVerb[i]);
                        }
                        mainVerb.length = 1;        //we just remove the other verbs from the main verb array
                    }
                }
                //till here main verb cannot have 0 length
                let arrayAfterMainVerb = wordArray.slice(getIndex(mainVerb[0], wordArray) + 1);
                //the user wants us to choose only the action nothing more
                if (arrayAfterMainVerb.length == 0) {
                    returnObj.verbs = mainVerb;
                    returnObj.objects = [];         //an empty array
                    return returnObj;
                }
                //we have more options to choose from
                else {
                    //if we have an or in the sentence, it means multiple options available
                    var orPresent = false;
                    let orIndex;
                    for (x = 0; x < arrayAfterMainVerb.length; x++) {
                        if (arrayAfterMainVerb[x] == 'or') {
                            orPresent = true;
                            orIndex = x;
                            break;
                        }
                    }
                    //we have multiple options to choose from
                    if (orPresent == true) {
                        let detectedObjects = new Array(0);     //store the detected objects in this array
                        //the part after the or is an independent object
                        let afterOrArray = arrayAfterMainVerb.slice(orIndex + 1);
                        let filteredObject = filterPrep(afterOrArray);
                        detectedObjects.push(filteredObject.join(" "));
                        //now we come to the part before the 'or'
                        let beforeOrArray = arrayAfterMainVerb.slice(0, orIndex);
                        //we just include the object verbs, pronouns and nouns (common and proper)
                        //first include the object verbs
                        beforeOrArray.forEach((el, i) => {
                            objVerbs.forEach(element => {
                                if (el == element) {
                                    beforeOrArray[i] = null;        //when we find a match of object verb, we remove it from the words array
                                    detectedObjects.push(el);       //include in the objects
                                }
                            })
                        })
                        let nounsDetected = new Array(0);
                        for (x = 0; x < beforeOrArray.length; x++) {
                            if (beforeOrArray[x] !== null)
                                if (await wordpos.isNoun(beforeOrArray[x].toLowerCase()))
                                    nounsDetected.push(beforeOrArray[x]);
                        }
                        //also include the pronouns as well as the proper nouns
                        beforeOrArray.forEach(el => {
                            if (el !== null)
                                if (checkPronoun(el) == true || el.charAt(0) == el.charAt(0).toUpperCase())
                                    nounsDetected.push(el);
                        });
                        for (var i = 0; i < nounsDetected.length; i++) {
                            let index = getIndex(nounsDetected[i], beforeOrArray);
                            //the noun must not be an adjective at the same time
                            let isAdj = await wordpos.isAdjective(nounsDetected[i]);
                            if (index !== undefined && isAdj == false) {
                                //if it is not the first word
                                if (index !== 0) {
                                    //check if the word before is an adjective
                                    let wordBefore = beforeOrArray[index - 1]
                                    let wordBeforeIsAdj = false;
                                    if (wordBefore !== null)
                                        wordBeforeIsAdj = await wordpos.isAdjective(wordBefore);
                                    if (wordBeforeIsAdj == true) {
                                        //we now check if the word is a compound word,
                                        let compound = checkCompound(beforeOrArray[index], beforeOrArray[index + 1], beforeOrArray[index + 2]);
                                        switch (compound) {
                                            case 1: //means the word is a single word not compound
                                                detectedObjects.push(beforeOrArray[index - 1] + " " + beforeOrArray[index]);
                                                beforeOrArray[index - 1] = null;
                                                beforeOrArray[index] = null;
                                                break;
                                            case 2: //means the word is a combination of two words as compound
                                                detectedObjects.push(beforeOrArray[index - 1] + " " + beforeOrArray[index] + " " + beforeOrArray[index + 1]);
                                                beforeOrArray[index - 1] = null;
                                                beforeOrArray[index] = null;
                                                beforeOrArray[index + 1] = null;
                                                break;
                                            case 3: //means the word is a combination of three words as compound
                                                detectedObjects.push(beforeOrArray[index - 1] + " " + beforeOrArray[index] + " " + beforeOrArray[index + 1] + " " + beforeOrArray[index + 2]);
                                                beforeOrArray[index - 1] = null;
                                                beforeOrArray[index] = null;
                                                beforeOrArray[index + 1] = null;
                                                beforeOrArray[index + 2] = null;
                                                break;
                                        }
                                    }
                                    //if the word before is not an adjective, we just check if it is a compound word and then include it
                                    else {
                                        let compound = checkCompound(beforeOrArray[index], beforeOrArray[index + 1], beforeOrArray[index + 2]);
                                        switch (compound) {
                                            case 1:
                                                detectedObjects.push(beforeOrArray[index]);
                                                beforeOrArray[index] = null;
                                                break;
                                            case 2:
                                                detectedObjects.push(beforeOrArray[index] + " " + beforeOrArray[index + 1]);
                                                beforeOrArray[index] = null;
                                                beforeOrArray[index + 1] = null;
                                                break;
                                            case 3:
                                                detectedObjects.push(beforeOrArray[index] + " " + beforeOrArray[index + 1] + " " + beforeOrArray[index + 2]);
                                                beforeOrArray[index] = null;
                                                beforeOrArray[index + 1] = null;
                                                beforeOrArray[index + 2] = null;
                                                break;
                                        }
                                    }
                                }
                                //in case this is the very first word of the array
                                else {
                                    let compound = checkCompound(beforeOrArray[index], beforeOrArray[index + 1], beforeOrArray[index + 2]);
                                    switch (compound) {
                                        case 1:
                                            detectedObjects.push(beforeOrArray[index]);
                                            beforeOrArray[index] = null;
                                            break;
                                        case 2:
                                            let object = beforeOrArray[index] + beforeOrArray[index + 1];
                                            detectedObjects.push(object);
                                            beforeOrArray[index] = null;
                                            beforeOrArray[index + 1] = null;
                                            break;
                                        case 3:
                                            object = beforeOrArray[index] + beforeOrArray[index + 1] + beforeOrArray[index + 2];
                                            detectedObjects.push(object);
                                            beforeOrArray[index] = null;
                                            beforeOrArray[index + 1] = null;
                                            beforeOrArray[index + 2] = null;
                                            break;
                                    }
                                }
                            }
                        }
                        returnObj.verbs = mainVerb;
                        returnObj.objects = detectedObjects;
                        return returnObj;
                    }
                    //we have a single choice after the main verb
                    else {
                        //if we don't have OR it means that we are provided with just a single option

                        let filteredArray = filterPrep(arrayAfterMainVerb);
                        returnObj.verbs = mainVerb;
                        returnObj.objects = [filteredArray.join(" ")];
                        return returnObj;
                    }
                }
            }
            else {
                console.error("Not a decision speech: has no verb in the sentence.")
                return null;
            }
        }
        //otherwise our speech is not a decision speech
        else {
            console.error("Not a decision speech: does not include decision indicators.")
            return null;
        }

    }
    //if it does not include you then it is not a decision speech
    else {
        console.error("Not a decision speech: Does not include 'you'")
        return null;
    }

}
//finally export our module
module.exports.decisionSpeech = main;

function checkCompound(word1, word2, word3) {
    if (word1 == null || word1 == undefined) word1 = "";
    if (word2 == null || word2 == undefined) word2 = "";
    if (word3 == null || word3 == undefined) word3 = "";
    //first check the three word combination
    for (var x = 0; x < compoundList.length; x++) {
        if (compoundList[x] == word1 + ' ' + word2 + ' ' + word3) {
            return 3;
        }
    }
    //now we check the two word combination
    for (x = 0; x < compoundList.length; x++) {
        if (compoundList[x] == word1 + ' ' + word2) {
            return 2;
        }
    }
    //if the two word combination is also undefined, then it is surely a single word
    return 1;
}

function checkPronoun(word) {
    for (var x = 0; x < pronounList.length; x++) {
        if (word == pronounList[x])
            return true;
    }
    return false;
}

function filterPrep(givenArray) {
    //remove the prepositions from the given array
    var filteredArray = new Array(0);       //filtered array
    givenArray.forEach(el => {
        let isAPrep = false;
        for (var x = 0; x < prepositionList.length; x++) {
            if (el == prepositionList[x]) {
                isAPrep = true;
                break;
            }
        }
        if (isAPrep == false) filteredArray.push(el)
    })
    return filteredArray;
}

function getIndex(element, array) {
    let index = undefined;
    for (var i = 0; i < array.length; i++) {
        if (element == array[i]) {
            index = i;
            break;
        }
    }
    return index;
}

//converts the string into an array
function getArrayFromStr(speech) {
    var wordArray = new Array(0);
    var tempSpeech = speech + " ";
    for (var i = 0, lastIndex = 0; i <= tempSpeech.length - 1; i++) {
        if (tempSpeech.charAt(i) == " ") {
            wordArray.push(tempSpeech.slice(lastIndex, i));             //include the word in the array
            lastIndex = i + 1;
        }
    }
    return wordArray;
}