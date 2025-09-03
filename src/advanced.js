//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2025, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

let listenersExist = false;

async function init() {
    displayVersion();
    setEventListeners();
    getMoreAdvancedSettingsDefaults();
    await getMoreAdvancedSettings();
    displayMoreAdvancedSettings();
}

function setEventListeners() {
    if (!listenersExist) {
        document.getElementById("btnSaveMoreAdvanced").addEventListener("click", saveMoreAdvancedSettings);
        document.getElementById("btnRestoreMoreAdvancedDefaults").addEventListener("click", restoreMoreAdvancedSettings);
        listenersExist = true;
    }
}

async function saveMoreAdvancedSettings() {
    const settings = [
        { id: "staticfocalunicode", key: "madvStaticFocalUnicodeCharacter", type: "string" },
        { id: "longwordcharactercounttrigger", key: "madvLongWordTriggerCharacterCount", type: "number" },
        { id: "longwordcharacterperslidecountpostsplit", key: "madvLongWordMinCharacterPerSlidePostSplit", type: "number" },
        { id: "longwordlastslidecharactercount", key: "madvLongWordCharacterTriggerDoNotJoin", type: "number" },
        { id: "enablespacecharacterinsertion", key: "madvEnableSpaceInsertion", type: "boolean" },
        { id: "removelastslideifnullorempty", key: "madvRemoveLastSlideNullOrEmpty", type: "boolean" },
        { id: "enabledhyphenatedwordsplit", key: "madvEnableHyphenatedWordSplit", type: "boolean" },
        { id: "consolidatesinglehyphenatedword", key: "madvConsolidateHyphenatedWord", type: "boolean" },
        { id: "enablehyphenationoflongerwords", key: "madvEnableLongWordHyphenation", type: "boolean" },
        { id: "enableacronymdetection", key: "madvEnableAcronymDetection", type: "boolean" },
        { id: "enablenumberanddecimaldetection", key: "madvEnableNumberDecimalDetection", type: "boolean" },
        { id: "deleteemtpyslides", key: "madvDeleteEmptySlides", type: "boolean" },
        { id: "largestepnumberofslides", key: "madvLargeStepNumberOfSlides", type: "number" },
        { id: "wpmadjustmentstep", key: "madvWPMAdjustmentStep", type: "number" },
        { id: "basicminimumslideduration", key: "madvBasicMinimumSlideDuration", type: "number" },
        { id: "wordlengthminimumslideduration", key: "madvWordLengthMinimumSlideDuration", type: "number" },
        { id: "wordfreqminimumslideduration", key: "madvWordFreqMinimumSlideDuration", type: "number" },
        { id: "wordfreqhighestfreqslideduration", key: "madvWordFreqHighestFreqSlideDuration", type: "number" },
        { id: "wordfreqlowestfreqslideduration", key: "madvWordFreqLowestFreqSlideDuration", type: "number" },
        { id: "alwayshidefocalguide", key: "madvAlwaysHideFocalGuide", type: "boolean" },
        { id: "optleftmarginpercent", key: "madvOptimisedPositionLeftMarginPercent", type: "number" },
        { id: "showsentence", key: "madvDisplaySentenceWhenPaused", type: "boolean" },
        { id: "autohidesentence", key: "madvAutoHideSentence", type: "boolean" },
        { id: "autohidesentenceseconds", key: "madvAutoHideSentenceSeconds", type: "number" },
        { id: "showsentenceborder", key: "madvDisplaySentenceTopBorder", type: "boolean" },
        { id: "sentencereaderopen", key: "madvDisplaySentenceAtReaderOpen", type: "boolean" },
        { id: "sentencebackwardwordcount", key: "madvSentenceBackwardWordCount", type: "number" },
        { id: "sentencepositionpercentoffset", key: "madvSentencePositionPercentOffset", type: "number" },
        { id: "displayprogress", key: "madvDisplayProgress", type: "boolean" },
        { id: "displaysocial", key: "madvDisplaySocial", type: "boolean" },
        { id: "displaywpmsummary", key: "madvDisplayWPMSummary", type: "boolean" },
        { id: "enableautotextselection", key: "madvHotkeySelectionEnabled", type: "boolean" },
        { id: "saveslideposition", key: "madvSaveSlidePosition", type: "boolean" }
    ];

    for (const setting of settings) {
        const element = document.getElementById(setting.id);
        let value;

        switch (setting.type) {
            case "string":
                value = element.value;
                break;
            case "number":
                value = parseFloat(element.value);
                if (isNaN(value)) continue;
                break;
            case "boolean":
                value = element.checked;
                break;
        }

        await saveToLocal(setting.key, value);
        window[setting.key] = value;
    }

    alert("Please restart Sprint Reader for these changes to take effect");
}

function restoreMoreAdvancedSettings() {
    getMoreAdvancedSettingsDefaults();
    displayMoreAdvancedSettings();
    saveMoreAdvancedSettings();
}

function displayMoreAdvancedSettings() {
    const settings = [
        { id: "staticfocalunicode", key: "madvStaticFocalUnicodeCharacter", type: "value" },
        { id: "enablespacecharacterinsertion", key: "madvEnableSpaceInsertion", type: "checkbox" },
        { id: "removelastslideifnullorempty", key: "madvRemoveLastSlideNullOrEmpty", type: "checkbox" },
        { id: "enabledhyphenatedwordsplit", key: "madvEnableHyphenatedWordSplit", type: "checkbox" },
        { id: "consolidatesinglehyphenatedword", key: "madvConsolidateHyphenatedWord", type: "checkbox" },
        { id: "enablehyphenationoflongerwords", key: "madvEnableLongWordHyphenation", type: "checkbox" },
        { id: "longwordcharactercounttrigger", key: "madvLongWordTriggerCharacterCount", type: "value" },
        { id: "longwordcharacterperslidecountpostsplit", key: "madvLongWordMinCharacterPerSlidePostSplit", type: "value" },
        { id: "longwordlastslidecharactercount", key: "madvLongWordCharacterTriggerDoNotJoin", type: "value" },
        { id: "enableacronymdetection", key: "madvEnableAcronymDetection", type: "checkbox" },
        { id: "enablenumberanddecimaldetection", key: "madvEnableNumberDecimalDetection", type: "checkbox" },
        { id: "deleteemtpyslides", key: "madvDeleteEmptySlides", type: "checkbox" },
        { id: "wpmadjustmentstep", key: "madvWPMAdjustmentStep", type: "value" },
        { id: "basicminimumslideduration", key: "madvBasicMinimumSlideDuration", type: "value" },
        { id: "wordlengthminimumslideduration", key: "madvWordLengthMinimumSlideDuration", type: "value" },
        { id: "wordfreqminimumslideduration", key: "madvWordFreqMinimumSlideDuration", type: "value" },
        { id: "wordfreqhighestfreqslideduration", key: "madvWordFreqHighestFreqSlideDuration", type: "value" },
        { id: "wordfreqlowestfreqslideduration", key: "madvWordFreqLowestFreqSlideDuration", type: "value" },
        { id: "alwayshidefocalguide", key: "madvAlwaysHideFocalGuide", type: "checkbox" },
        { id: "optleftmarginpercent", key: "madvOptimisedPositionLeftMarginPercent", type: "value" },
        { id: "showsentence", key: "madvDisplaySentenceWhenPaused", type: "checkbox" },
        { id: "autohidesentence", key: "madvAutoHideSentence", type: "checkbox" },
        { id: "showsentenceborder", key: "madvDisplaySentenceTopBorder", type: "checkbox" },
        { id: "sentencereaderopen", key: "madvDisplaySentenceAtReaderOpen", type: "checkbox" },
        { id: "displayprogress", key: "madvDisplayProgress", type: "checkbox" },
        { id: "displaysocial", key: "madvDisplaySocial", type: "checkbox" },
        { id: "displaywpmsummary", key: "madvDisplayWPMSummary", type: "checkbox" },
        { id: "autohidesentenceseconds", key: "madvAutoHideSentenceSeconds", type: "value" },
        { id: "sentencepositionpercentoffset", key: "madvSentencePositionPercentOffset", type: "value" },
        { id: "largestepnumberofslides", key: "madvLargeStepNumberOfSlides", type: "value" },
        { id: "enableautotextselection", key: "madvHotkeySelectionEnabled", type: "checkbox" },
        { id: "saveslideposition", key: "madvSaveSlidePosition", type: "checkbox" }
    ];

    for (const setting of settings) {
        const element = document.getElementById(setting.id);
        const value = window[setting.key];

        if (setting.type === "checkbox") {
            element.checked = value;
        } else {
            element.value = value;
        }
    }
}

document.addEventListener("DOMContentLoaded", init);