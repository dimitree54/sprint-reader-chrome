//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2024, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// This file contains generic utility functions and
// all the advanced settings used to control the
// display and splitting algorithm

//------------------------------------------------------------------------------
// Misc.
let textPositionDelimiter = "{{**POSI<>TION**}}";

//------------------------------------------------------------------------------
// MORE ADVANCED SETTINGS (Variables)
// Algorithm
var madvBasicMinimumSlideDuration;
var madvConsolidateHyphenatedWord;
var madvDeleteEmptySlides;
var madvEnableAcronymDetection;
var madvEnableHyphenatedWordSplit;
var madvEnableLongWordHyphenation;
var madvEnableNumberDecimalDetection;
var madvEnableSpaceInsertion;
var madvLongWordCharacterTriggerDoNotJoin;
var madvLongWordMinCharacterPerSlidePostSplit;
var madvLongWordTriggerCharacterCount;
var madvRemoveLastSlideNullOrEmpty;
var madvStaticFocalUnicodeCharacter;
var madvWordFreqHighestFreqSlideDuration;
var madvWordFreqLowestFreqSlideDuration;
var madvWordFreqMinimumSlideDuration;
var madvWordLengthMinimumSlideDuration;
var madvWPMAdjustmentStep;
// Display
var madvAlwaysHideFocalGuide;
var madvAutoHideSentenceSeconds;
var madvAutoHideSentence;
var madvDisplayProgress;
var madvDisplaySentenceAtReaderOpen;
var madvDisplaySentenceTopBorder;
var madvDisplaySentenceWhenPaused;
var madvDisplaySocial;
var madvDisplayWPMSummary;
var madvLargeStepNumberOfSlides;
var madvOptimisedPositionLeftMarginPercent;
var madvSentenceBackwardWordCount;
var madvSentencePositionPercentOffset;
// Text Selection
var madvHotkeySelectionEnabled;
// Text Retrieval
var madvSaveSlidePosition;

// Get the advanced settings from the local storage
async function getMoreAdvancedSettings() {
    // Algorithm
    madvBasicMinimumSlideDuration = await getFromLocalGreaterThanZero("madvBasicMinimumSlideDuration", madvBasicMinimumSlideDuration);
    madvConsolidateHyphenatedWord = await getFromLocalNotEmpty("madvConsolidateHyphenatedWord", madvConsolidateHyphenatedWord);
    madvDeleteEmptySlides = await getFromLocalNotEmpty("madvDeleteEmptySlides", madvDeleteEmptySlides);
    madvEnableAcronymDetection = await getFromLocalNotEmpty("madvEnableAcronymDetection", madvEnableAcronymDetection);
    madvEnableHyphenatedWordSplit = await getFromLocalNotEmpty("madvEnableHyphenatedWordSplit", madvEnableHyphenatedWordSplit);
    madvEnableLongWordHyphenation = await getFromLocalNotEmpty("madvEnableLongWordHyphenation", madvEnableLongWordHyphenation);
    madvEnableNumberDecimalDetection = await getFromLocalNotEmpty("madvEnableNumberDecimalDetection", madvEnableNumberDecimalDetection);
    madvEnableSpaceInsertion = await getFromLocalNotEmpty("madvEnableSpaceInsertion", madvEnableSpaceInsertion);
    madvLongWordCharacterTriggerDoNotJoin = await getFromLocalGreaterThanZero("madvLongWordCharacterTriggerDoNotJoin", madvLongWordCharacterTriggerDoNotJoin);
    madvLongWordMinCharacterPerSlidePostSplit = await getFromLocalGreaterThanZero("madvLongWordMinCharacterPerSlidePostSplit", madvLongWordMinCharacterPerSlidePostSplit);
    madvLongWordTriggerCharacterCount = await getFromLocalGreaterThanZero("madvLongWordTriggerCharacterCount", madvLongWordTriggerCharacterCount);
    madvRemoveLastSlideNullOrEmpty = await getFromLocalNotEmpty("madvRemoveLastSlideNullOrEmpty", madvRemoveLastSlideNullOrEmpty);
    madvStaticFocalUnicodeCharacter = await getFromLocalNotEmpty("madvStaticFocalUnicodeCharacter", madvStaticFocalUnicodeCharacter);
    madvWordFreqHighestFreqSlideDuration = await getFromLocalGreaterThanZero("madvWordFreqHighestFreqSlideDuration", madvWordFreqHighestFreqSlideDuration);
    madvWordFreqLowestFreqSlideDuration = await getFromLocalGreaterThanZero("madvWordFreqLowestFreqSlideDuration", madvWordFreqLowestFreqSlideDuration);
    madvWordFreqMinimumSlideDuration = await getFromLocalGreaterThanZero("madvWordFreqMinimumSlideDuration", madvWordFreqMinimumSlideDuration);
    madvWordLengthMinimumSlideDuration = await getFromLocalGreaterThanZero("madvWordLengthMinimumSlideDuration", madvWordLengthMinimumSlideDuration);
    madvWPMAdjustmentStep = await getFromLocalGreaterThanZero("madvWPMAdjustmentStep", madvWPMAdjustmentStep);
    // Display
    madvAlwaysHideFocalGuide = await getFromLocalNotEmpty("madvAlwaysHideFocalGuide", madvAlwaysHideFocalGuide);
    madvAutoHideSentenceSeconds = await getFromLocalGreaterThanZero("madvAutoHideSentenceSeconds", madvAutoHideSentenceSeconds);
    madvAutoHideSentence = await getFromLocalNotEmpty("madvAutoHideSentence", madvAutoHideSentence);
    madvDisplayProgress = await getFromLocalNotEmpty("madvDisplayProgress", madvDisplayProgress);
    madvDisplaySentenceAtReaderOpen = await getFromLocalNotEmpty("madvDisplaySentenceAtReaderOpen", madvDisplaySentenceAtReaderOpen);
    madvDisplaySentenceTopBorder = await getFromLocalNotEmpty("madvDisplaySentenceTopBorder", madvDisplaySentenceTopBorder);
    madvDisplaySentenceWhenPaused = await getFromLocalNotEmpty("madvDisplaySentenceWhenPaused", madvDisplaySentenceWhenPaused);
    madvDisplaySocial = await getFromLocalNotEmpty("madvDisplaySocial", madvDisplaySocial);
    madvDisplayWPMSummary = await getFromLocalNotEmpty("madvDisplayWPMSummary", madvDisplayWPMSummary);
    madvLargeStepNumberOfSlides = await getFromLocalGreaterThanZero("madvLargeStepNumberOfSlides", madvLargeStepNumberOfSlides);
    madvOptimisedPositionLeftMarginPercent = await getFromLocalGreaterThanZero("madvOptimisedPositionLeftMarginPercent", madvOptimisedPositionLeftMarginPercent);
    madvSentenceBackwardWordCount = await getFromLocalGreaterThanZero("madvSentenceBackwardWordCount", madvSentenceBackwardWordCount);
    madvSentencePositionPercentOffset = await getFromLocalGreaterThanZero("madvSentencePositionPercentOffset", madvSentencePositionPercentOffset);
    // Text Selection
    madvHotkeySelectionEnabled = await getFromLocalNotEmpty("madvHotkeySelectionEnabled", madvHotkeySelectionEnabled);
    // Text Retrieval
    madvSaveSlidePosition = await getFromLocalNotEmpty("madvSaveSlidePosition", madvSaveSlidePosition);
}

// Set the default values of the advanced settings
function getMoreAdvancedSettingsDefaults() {
    // Algorithm
    madvBasicMinimumSlideDuration = 0;
    madvConsolidateHyphenatedWord = true;
    madvDeleteEmptySlides = true;
    madvEnableAcronymDetection = true;
    madvEnableHyphenatedWordSplit = true;
    madvEnableLongWordHyphenation = true;
    madvEnableNumberDecimalDetection = true;
    madvEnableSpaceInsertion = true;
    madvLongWordCharacterTriggerDoNotJoin = 4;
    madvLongWordMinCharacterPerSlidePostSplit = 6;
    madvLongWordTriggerCharacterCount = 13;
    madvRemoveLastSlideNullOrEmpty = true;
    madvStaticFocalUnicodeCharacter = "";
    madvWordFreqHighestFreqSlideDuration = 40;
    madvWordFreqLowestFreqSlideDuration = 300;
    madvWordFreqMinimumSlideDuration = 40;
    madvWordLengthMinimumSlideDuration = 0;
    madvWPMAdjustmentStep = 25;
    // Display
    madvAlwaysHideFocalGuide = false;
    madvAutoHideSentence = false;
    madvAutoHideSentenceSeconds = 5;
    madvDisplayProgress = true;
    madvDisplaySentenceAtReaderOpen = true;
    madvDisplaySentenceTopBorder = true;
    madvDisplaySentenceWhenPaused = true;
    madvDisplaySocial = true;
    madvDisplayWPMSummary = true;
    madvLargeStepNumberOfSlides = 10;
    madvOptimisedPositionLeftMarginPercent = 30;
    madvSentenceBackwardWordCount = 20;
    madvSentencePositionPercentOffset = 50;
    // Text Selection
    madvHotkeySelectionEnabled = false;
    // Text Retrieval
    madvSaveSlidePosition = true;
}

//------------------------------------------------------------------------------
// Obtain the version number of the chrome extension and display
function displayVersion() {
    var version = chrome.runtime.getManifest().version;
    var divVersion = document.getElementById("version");
    if (divVersion.innerHTML) divVersion.innerHTML = "<br><b>Sprint Reader</b> (v" + version + ")";
}

//------------------------------------------------------------------------------
// String is empty
function isEmptyString(str) {
    return !str || 0 === str.length;
}

//------------------------------------------------------------------------------
// Reverse a string (by letter)
function reverseString(s) {
    return s.split("").reverse().join("");
}

//------------------------------------------------------------------------------
// Return the full name of the selected text language
// Returns a language object
//	- language.shortname
//	- language.fullname
//	- language.isrighttoleft
function getLanguage(selectedText) {
    // Detect the language of the passed in text
    var selectedTextLanguage;
    guessLanguage.detect(selectedText, function (language) {
        selectedTextLanguage = language;
        //console.log('[Sprint Reader] Detected language of provided text is [' + language + ']');
    });

    var language = {};
    language.shortname = selectedTextLanguage;
    language.isrighttoleft = false;
    language.pattern = "en-us";

    switch (selectedTextLanguage) {
        case "en":
            language.fullname = "English";
            break;
        case "ab":
            language.fullname = "Abkhazian";
            break;
        case "af":
            language.fullname = "Afrikaans";
            break;
        case "ar":
            language.fullname = "Arabic";
            language.isrighttoleft = true;
            break;
        case "az":
            language.fullname = "Azeri";
            break;
        case "be":
            language.fullname = "Belarusian";
            language.pattern = "be";
            break;
        case "bg":
            language.fullname = "Bulgarian";
            break;
        case "bn":
            language.fullname = "Bengali";
            language.pattern = "bn";
            break;
        case "bo":
            language.fullname = "Tibetan";
            break;
        case "br":
            language.fullname = "Breton";
            break;
        case "ca":
            language.fullname = "Catalan";
            language.pattern = "ca";
            break;
        case "ceb":
            language.fullname = "Cebuano";
            break;
        case "cs":
            language.fullname = "Czech";
            language.pattern = "cz";
            break;
        case "cy":
            language.fullname = "Welsh";
            break;
        case "da":
            language.fullname = "Danish";
            language.pattern = "da";
            break;
        case "de":
            language.fullname = "German";
            language.pattern = "de";
            break;
        case "el":
            language.fullname = "Greek";
            break;
        case "eo":
            language.fullname = "Esperanto";
            break;
        case "es":
            language.fullname = "Spanish";
            language.pattern = "es";
            break;
        case "et":
            language.fullname = "Estonian";
            break;
        case "eu":
            language.fullname = "Basque";
            break;
        case "fa":
            language.fullname = "Farsi";
            break;
        case "fi":
            language.fullname = "Finnish";
            language.pattern = "fi";
            break;
        case "fo":
            language.fullname = "Faroese";
            break;
        case "fr":
            language.fullname = "French";
            language.pattern = "fr";
            break;
        case "fy":
            language.fullname = "Frisian";
            break;
        case "gd":
            language.fullname = "Scots Gaelic";
            break;
        case "gl":
            language.fullname = "Galician";
            break;
        case "gu":
            language.fullname = "Gujarati";
            language.pattern = "gu";
            break;
        case "ha":
            language.fullname = "Hausa";
            break;
        case "haw":
            language.fullname = "Hawaiian";
            break;
        case "he":
            language.fullname = "Hebrew";
            language.isrighttoleft = true;
            break;
        case "hi":
            language.fullname = "Hindi";
            language.pattern = "hi";
            break;
        case "hr":
            language.fullname = "Croatian";
            break;
        case "hu":
            language.fullname = "Hungarian";
            language.pattern = "hu";
            break;
        case "hy":
            language.fullname = "Armenian";
            language.pattern = "hy";
            break;
        case "id":
            language.fullname = "Indonesian";
            break;
        case "is":
            language.fullname = "Icelandic";
            break;
        case "it":
            language.fullname = "Italian";
            language.pattern = "it";
            break;
        case "ja":
            language.fullname = "Japanese";
            break;
        case "ka":
            language.fullname = "Georgian";
            break;
        case "kk":
            language.fullname = "Kazakh";
            break;
        case "km":
            language.fullname = "Cambodian";
            break;
        case "ko":
            language.fullname = "Korean";
            break;
        case "ku":
            language.fullname = "Kurdish";
            language.isrighttoleft = true;
            break;
        case "ky":
            language.fullname = "Kyrgyz";
            break;
        case "la":
            language.fullname = "Latin";
            language.pattern = "la";
            break;
        case "lt":
            language.fullname = "Lithuanian";
            language.pattern = "lt";
            break;
        case "lv":
            language.fullname = "Latvian";
            language.pattern = "lv";
            break;
        case "mg":
            language.fullname = "Malagasy";
            break;
        case "mk":
            language.fullname = "Macedonian";
            break;
        case "ml":
            language.fullname = "Malayalam";
            language.pattern = "ml";
            break;
        case "mn":
            language.fullname = "Mongolian";
            break;
        case "mr":
            language.fullname = "Marathi";
            break;
        case "ms":
            language.fullname = "Malay";
            break;
        case "nd":
            language.fullname = "Ndebele";
            break;
        case "ne":
            language.fullname = "Nepali";
            break;
        case "nl":
            language.fullname = "Dutch";
            language.pattern = "nl";
            break;
        case "nn":
            language.fullname = "Nynorsk";
            break;
        case "no":
            language.fullname = "Norwegian";
            language.pattern = "nb-no";
            break;
        case "nso":
            language.fullname = "Sepedi";
            break;
        case "pa":
            language.fullname = "Punjabi";
            language.isrighttoleft = true;
            language.pattern = "pa";
            break;
        case "pl":
            language.fullname = "Polish";
            language.pattern = "pl";
            break;
        case "ps":
            language.fullname = "Pashto";
            language.isrighttoleft = true;
            break;
        case "pt":
            language.fullname = "Portuguese";
            language.pattern = "pt";
            break;
        case "pt_PT":
            language.fullname = "Portuguese (Portugal)";
            language.pattern = "pt";
            break;
        case "pt_BR":
            language.fullname = "Portuguese (Brazil)";
            language.pattern = "pt";
            break;
        case "ro":
            language.fullname = "Romanian";
            break;
        case "ru":
            language.fullname = "Russian";
            language.pattern = "ru";
            break;
        case "sa":
            language.fullname = "Sanskrit";
            break;
        case "sh":
            language.fullname = "Serbo-Croatian";
            break;
        case "sk":
            language.fullname = "Slovak";
            language.pattern = "sk";
            language.isrighttoleft = false;
            break;
        case "sl":
            language.fullname = "Slovene";
            language.pattern = "sl";
            break;
        case "so":
            language.fullname = "Somali";
            break;
        case "sq":
            language.fullname = "Albanian";
            break;
        case "sr":
            language.fullname = "Serbian";
            break;
        case "sv":
            language.fullname = "Swedish";
            language.pattern = "sv";
            break;
        case "sw":
            language.fullname = "Swahili";
            break;
        case "ta":
            language.fullname = "Tamil";
            language.pattern = "ta";
            break;
        case "te":
            language.fullname = "Telugu";
            language.pattern = "te";
            break;
        case "th":
            language.fullname = "Thai";
            break;
        case "tl":
            language.fullname = "Tagalog";
            break;
        case "tlh":
            language.fullname = "Klingon";
            break;
        case "tn":
            language.fullname = "Setswana";
            break;
        case "tr":
            language.fullname = "Turkish";
            language.pattern = "tr";
            break;
        case "ts":
            language.fullname = "Tsonga";
            break;
        case "tw":
            language.fullname = "Tiwi";
            break;
        case "uk":
            language.fullname = "Ukrainian";
            language.pattern = "uk";
            break;
        case "ur":
            language.fullname = "Urdu";
            language.isrighttoleft = true;
            break;
        case "uz":
            language.fullname = "Uzbek";
            break;
        case "ve":
            language.fullname = "Venda";
            break;
        case "vi":
            language.fullname = "Vietnamese";
            break;
        case "xh":
            language.fullname = "Xhosa";
            break;
        case "zh":
            language.fullname = "Chinese";
            break;
        case "zh_TW":
            language.fullname = "Traditional Chinese (Taiwan)";
            break;
        default:
            language.fullname = "";
    }

    // load the pattern script
    var patternJS = "../lib/guess_language/language_patterns/" + language.pattern + ".js";
    $.ajax({
        async: false,
        url: patternJS,
        dataType: "script",
    });

    return language;
}

//------------------------------------------------------------------------------
// Return just the text part of the selected text or history item
function getSelectedTextFromResourceString(textFromResource) {
    if (textFromResource == null) return { text: "", position: 0 };
    if (textFromResource.length == 0) return { text: "", position: 0 };
    var textArray = textFromResource.split(textPositionDelimiter);
    if (textArray.length >= 1) {
        return {
            text: textArray[0],
            fulltext: textFromResource,
            position: parseInt(textArray[1]),
        };
    }
    return { text: "", position: 0 };
}

//------------------------------------------------------------------------------
// Create an HTML safe string, used when displaying the entire text contents
function htmlEntitiesEncode(str) {
    return str.replace(/[&<>"']/g, function (match) {
        const entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return entityMap[match];
    });
}

//------------------------------------------------------------------------------
// Decode an html safe string (creates unsafe string)
function htmlEntitiesDecode(str) {
    return $("<div />").html(str).text();
}

//------------------------------------------------------------------------------
// Replace all SVG images with inline SVG
function insertSVG() {
    jQuery(document).ready(function () {
        jQuery("img.svg").each(function () {
            var $img = jQuery(this);
            var imgID = $img.attr("id");
            var imgClass = $img.attr("class");
            var imgURL = $img.attr("src");

            jQuery.get(
                imgURL,
                function (data) {
                    // Get the SVG tag, ignore the rest
                    var $svg = jQuery(data).find("svg");

                    // Add replaced image's ID to the new SVG
                    if (typeof imgID !== "undefined") {
                        $svg = $svg.attr("id", imgID);
                    }
                    // Add replaced image's classes to the new SVG
                    if (typeof imgClass !== "undefined") {
                        $svg = $svg.attr("class", imgClass + " replaced-svg");
                    }

                    // Remove any invalid XML tags as per http://validator.w3.org
                    $svg = $svg.removeAttr("xmlns:a");

                    // Replace image with new SVG
                    $img.replaceWith($svg);
                },
                "xml",
            );
        });
    });

    $(window).load(function () {
        // Update the css for the github_logo class (path)
        jQuery(".github_logo path").css("fill", colorSentenceBorder);
    });
}

//------------------------------------------------------------------------------
// Load a script passed in via URL parameter
function loadScript(url, callback) {
    // Adding the script tag to the head of the document
    var head = document.getElementsByTagName("head")[0];
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}

//------------------------------------------------------------------------------
// Local Storage Management
//
// Get an item from local storage, ensure the item is greater then zero
// Only assign to variable if the item passes the test
async function getFromLocalGreaterThanZero(key, defaultValue) {
    try {
        const value = await getFromLocal(key);

        if (value && parseInt(value) > 0) {
            return parseInt(value);
        } else {
            return defaultValue;
        }
    } catch (error) {
        console.error(`[Sprint Redaer] Error retrieving ${key} from storage:`, error);
        return defaultValue;
    }
}
// Get an item from local storage, ensure the item is not empty
// Only assign to variable if the item passes the test
async function getFromLocalNotEmpty(key, variable) {
    try {
        const value = await getFromLocal(key);

        if (typeof value == "boolean") {
            variable = value;
        } else if (value && !isEmptyString(value)) {
            variable = value;
        }
        return variable;
    } catch (error) {
        console.error(`[Sprint Redaer] Error retrieving ${key} from storage:`, error);
        return variable;
    }
}
// Get an item from local storage, ensure the item is a number
// Only assign to variable if the item passes the test
async function getFromLocalIsNumber(key, variable) {
    try {
        const value = await getFromLocal(key);

        if (value && !isEmptyString(value) && !isNaN(value)) {
            variable = value;
            variable = parseInt(variable);
        }
        return variable;
    } catch (error) {
        console.error(`[Sprint Redaer] Error retrieving ${key} from storage:`, error);
        return variable;
    }
}
// Synchronous local storage get
function getFromLocalSync(key) {
    return new Promise((resolve, reject) => {
        try {
            chrome.storage.local.get([key], (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result[key]);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}
async function getFromLocal(key) {
    try {
        const result = await getFromLocalSync(key);
        //console.log('[Sprint Reader] getFromLocal: ' + key + ' : ' + result);
        return result;
    } catch (error) {
        console.error("[Sprint Reader] Error getting data from local storage:", error);
        throw error;
    }
}
// Synchronous local storage set
function saveToLocalSync(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: value }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve();
            }
        });
    });
}
async function saveToLocal(key, value) {
    try {
        await saveToLocalSync(key, value);
        //console.log('[Sprint Reader] saveToLocal: ' + key + ' : ' + value);
    } catch (error) {
        console.error("[Sprint Reader] Error saving data to local storage:", error);
    }
}