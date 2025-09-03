//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2025, Anthony Nosek
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
    madvLongWordTriggerCharacterCount = 17;
    madvRemoveLastSlideNullOrEmpty = true;
    madvStaticFocalUnicodeCharacter = "";
    madvWordFreqHighestFreqSlideDuration = 40;
    madvWordFreqLowestFreqSlideDuration = 300;
    madvWordFreqMinimumSlideDuration = 40;
    madvWordLengthMinimumSlideDuration = 0;
    madvWPMAdjustmentStep = 50;
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
const languageMap = {
    en: { fullname: "English", pattern: "en-us" },
    ab: { fullname: "Abkhazian" },
    af: { fullname: "Afrikaans" },
    ar: { fullname: "Arabic", isrighttoleft: true },
    az: { fullname: "Azeri" },
    be: { fullname: "Belarusian", pattern: "be" },
    bg: { fullname: "Bulgarian" },
    bn: { fullname: "Bengali", pattern: "bn" },
    bo: { fullname: "Tibetan" },
    br: { fullname: "Breton" },
    ca: { fullname: "Catalan", pattern: "ca" },
    ceb: { fullname: "Cebuano" },
    cs: { fullname: "Czech", pattern: "cz" },
    cy: { fullname: "Welsh" },
    da: { fullname: "Danish", pattern: "da" },
    de: { fullname: "German", pattern: "de" },
    el: { fullname: "Greek" },
    eo: { fullname: "Esperanto" },
    es: { fullname: "Spanish", pattern: "es" },
    et: { fullname: "Estonian" },
    eu: { fullname: "Basque" },
    fa: { fullname: "Farsi" },
    fi: { fullname: "Finnish", pattern: "fi" },
    fo: { fullname: "Faroese" },
    fr: { fullname: "French", pattern: "fr" },
    fy: { fullname: "Frisian" },
    gd: { fullname: "Scots Gaelic" },
    gl: { fullname: "Galician" },
    gu: { fullname: "Gujarati", pattern: "gu" },
    ha: { fullname: "Hausa" },
    haw: { fullname: "Hawaiian" },
    he: { fullname: "Hebrew", isrighttoleft: true },
    hi: { fullname: "Hindi", pattern: "hi" },
    hr: { fullname: "Croatian" },
    hu: { fullname: "Hungarian", pattern: "hu" },
    hy: { fullname: "Armenian", pattern: "hy" },
    id: { fullname: "Indonesian" },
    is: { fullname: "Icelandic" },
    it: { fullname: "Italian", pattern: "it" },
    ja: { fullname: "Japanese" },
    ka: { fullname: "Georgian" },
    kk: { fullname: "Kazakh" },
    km: { fullname: "Cambodian" },
    ko: { fullname: "Korean" },
    ku: { fullname: "Kurdish", isrighttoleft: true },
    ky: { fullname: "Kyrgyz" },
    la: { fullname: "Latin", pattern: "la" },
    lt: { fullname: "Lithuanian", pattern: "lt" },
    lv: { fullname: "Latvian", pattern: "lv" },
    mg: { fullname: "Malagasy" },
    mk: { fullname: "Macedonian" },
    ml: { fullname: "Malayalam", pattern: "ml" },
    mn: { fullname: "Mongolian" },
    mr: { fullname: "Marathi" },
    ms: { fullname: "Malay" },
    nd: { fullname: "Ndebele" },
    ne: { fullname: "Nepali" },
    nl: { fullname: "Dutch", pattern: "nl" },
    nn: { fullname: "Nynorsk" },
    no: { fullname: "Norwegian", pattern: "nb-no" },
    nso: { fullname: "Sepedi" },
    pa: { fullname: "Punjabi", isrighttoleft: true, pattern: "pa" },
    pl: { fullname: "Polish", pattern: "pl" },
    ps: { fullname: "Pashto", isrighttoleft: true },
    pt: { fullname: "Portuguese", pattern: "pt" },
    pt_PT: { fullname: "Portuguese (Portugal)", pattern: "pt" },
    pt_BR: { fullname: "Portuguese (Brazil)", pattern: "pt" },
    ro: { fullname: "Romanian" },
    ru: { fullname: "Russian", pattern: "ru" },
    sa: { fullname: "Sanskrit" },
    sh: { fullname: "Serbo-Croatian" },
    sk: { fullname: "Slovak", pattern: "sk" },
    sl: { fullname: "Slovene", pattern: "sl" },
    so: { fullname: "Somali" },
    sq: { fullname: "Albanian" },
    sr: { fullname: "Serbian" },
    sv: { fullname: "Swedish", pattern: "sv" },
    sw: { fullname: "Swahili" },
    ta: { fullname: "Tamil", pattern: "ta" },
    te: { fullname: "Telugu", pattern: "te" },
    th: { fullname: "Thai" },
    tl: { fullname: "Tagalog" },
    tlh: { fullname: "Klingon" },
    tn: { fullname: "Setswana" },
    tr: { fullname: "Turkish", pattern: "tr" },
    ts: { fullname: "Tsonga" },
    tw: { fullname: "Tiwi" },
    uk: { fullname: "Ukrainian", pattern: "uk" },
    ur: { fullname: "Urdu", isrighttoleft: true },
    uz: { fullname: "Uzbek" },
    ve: { fullname: "Venda" },
    vi: { fullname: "Vietnamese" },
    xh: { fullname: "Xhosa" },
    zh: { fullname: "Chinese" },
    zh_TW: { fullname: "Traditional Chinese (Taiwan)" }
};

async function getLanguage(selectedText) {
    // Detect the language of the passed in text
    const selectedTextLanguage = await new Promise(resolve => {
        guessLanguage.detect(selectedText, language => {
            //console.log('[Sprint Reader] Detected language of provided text is [' + language + ']');
            resolve(language);
        });
    });

    const languageInfo = languageMap[selectedTextLanguage] || { fullname: "" };

    const language = {
        shortname: selectedTextLanguage,
        isrighttoleft: languageInfo.isrighttoleft || false,
        pattern: languageInfo.pattern || "en-us",
        fullname: languageInfo.fullname
    };

    // load the pattern script
    const patternJS = `../lib/guess_language/language_patterns/${language.pattern}.js`;
    try {
        await fetch(patternJS);
    } catch (error) {
        console.error('[Sprint Reader] Error loading language pattern script:', error.message);
    }

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
    // Use jQuery's newer .on() method for attaching event handlers
    $(document).on('DOMContentLoaded', function() {
        $("img.svg").each(function() {
            var $img = $(this);
            var imgID = $img.attr("id");
            var imgClass = $img.attr("class");
            var imgURL = $img.attr("src");

            // Use fetch API instead of jQuery.get to avoid potential CSP issues
            fetch(imgURL)
                .then(response => response.text())
                .then(data => {
                    // Parse the SVG string
                    var parser = new DOMParser();
                    var xmlDoc = parser.parseFromString(data, "image/svg+xml");
                    var $svg = $(xmlDoc.documentElement);

                    // Add replaced image's ID to the new SVG
                    if (typeof imgID !== "undefined") {
                        $svg.attr("id", imgID);
                    }

                    // Add replaced image's classes to the new SVG
                    if (typeof imgClass !== "undefined") {
                        $svg.attr("class", imgClass + " replaced-svg");
                    }

                    // Remove any invalid XML tags
                    $svg.removeAttr("xmlns:a");

                    // Replace image with new SVG
                    $img.replaceWith($svg);

                    // Update the css for the github_logo class (path)
                    // This is moved inside to ensure it runs after SVG replacement
                    $(".github_logo path").css("fill", colorSentenceBorder);
                })
                .catch(error => console.error('Error fetching SVG:', error));
        });
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