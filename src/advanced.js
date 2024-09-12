//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2024, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Have listeners been assigned?
let listenersExist;

// A long list of advanced settings controlled by this screen

// Initialise the screen
async function init() {
    displayVersion();
    setEventListeners();

    // More Advanced settings
    getMoreAdvancedSettingsDefaults();
    await getMoreAdvancedSettings();
    displayMoreAdvancedSettings();
}

function setEventListeners() {
    if (!listenersExist) {
        // Advanced settings buttons
        let divSaveMoreAdvanced = document.getElementById("btnSaveMoreAdvanced");
        divSaveMoreAdvanced.addEventListener("click", saveMoreAdvancedSettings, false);

        let divMoreAdvancedDefaults = document.getElementById("btnRestoreMoreAdvancedDefaults");
        divMoreAdvancedDefaults.addEventListener("click", restoreMoreAdvancedSettings, false);

        listenersExist = true;
    }
}

async function saveMoreAdvancedSettings() {
    // Can be an empty string
    let NEWmadvStaticFocalUnicodeCharacter = document.getElementById("staticfocalunicode").value;
    await saveToLocal("madvStaticFocalUnicodeCharacter", NEWmadvStaticFocalUnicodeCharacter);
    madvStaticFocalUnicodeCharacter = NEWmadvStaticFocalUnicodeCharacter;

    let NEWmadvLongWordTriggerCharacterCount = document.getElementById("longwordcharactercounttrigger").value;
    if (!isNaN(NEWmadvLongWordTriggerCharacterCount)) {
        await saveToLocal("madvLongWordTriggerCharacterCount", NEWmadvLongWordTriggerCharacterCount);
        madvLongWordTriggerCharacterCount = NEWmadvLongWordTriggerCharacterCount;
    }

    let NEWmadvLongWordMinCharacterPerSlidePostSplit = document.getElementById("longwordcharacterperslidecountpostsplit").value;
    if (!isNaN(NEWmadvLongWordMinCharacterPerSlidePostSplit)) {
        await saveToLocal("madvLongWordMinCharacterPerSlidePostSplit", NEWmadvLongWordMinCharacterPerSlidePostSplit);
        madvLongWordMinCharacterPerSlidePostSplit = NEWmadvLongWordMinCharacterPerSlidePostSplit;
    }

    let NEWmadvLongWordCharacterTriggerDoNotJoin = document.getElementById("longwordlastslidecharactercount").value;
    if (!isNaN(NEWmadvLongWordCharacterTriggerDoNotJoin)) {
        await saveToLocal("madvLongWordCharacterTriggerDoNotJoin", NEWmadvLongWordCharacterTriggerDoNotJoin);
        madvLongWordCharacterTriggerDoNotJoin = NEWmadvLongWordCharacterTriggerDoNotJoin;
    }

    let NEWmadvEnableSpaceInsertion = document.getElementById("enablespacecharacterinsertion").checked;
    await saveToLocal("madvEnableSpaceInsertion", NEWmadvEnableSpaceInsertion);

    let NEWmadvRemoveLastSlideNullOrEmpty = document.getElementById("removelastslideifnullorempty").checked;
    await saveToLocal("madvRemoveLastSlideNullOrEmpty", NEWmadvRemoveLastSlideNullOrEmpty);

    let NEWmadvEnableHyphenatedWordSplit = document.getElementById("enabledhyphenatedwordsplit").checked;
    await saveToLocal("madvEnableHyphenatedWordSplit", NEWmadvEnableHyphenatedWordSplit);

    let NEWmadvConsolidateHyphenatedWord = document.getElementById("consolidatesinglehyphenatedword").checked;
    await saveToLocal("madvConsolidateHyphenatedWord", NEWmadvConsolidateHyphenatedWord);

    let NEWmadvEnableLongWordHyphenation = document.getElementById("enablehyphenationoflongerwords").checked;
    await saveToLocal("madvEnableLongWordHyphenation", NEWmadvEnableLongWordHyphenation);

    let NEWmadvEnableAcronymDetection = document.getElementById("enableacronymdetection").checked;
    await saveToLocal("madvEnableAcronymDetection", NEWmadvEnableAcronymDetection);

    let NEWmadvEnableNumberDecimalDetection = document.getElementById("enablenumberanddecimaldetection").checked;
    await saveToLocal("madvEnableNumberDecimalDetection", NEWmadvEnableNumberDecimalDetection);

    let NEWmadvDeleteEmptySlides = document.getElementById("deleteemtpyslides").checked;
    await saveToLocal("madvDeleteEmptySlides", NEWmadvDeleteEmptySlides);

    let NEWmadvLargeStepNumberOfSlides = document.getElementById("largestepnumberofslides").value;
    if (!isNaN(NEWmadvLargeStepNumberOfSlides)) {
        await saveToLocal("madvLargeStepNumberOfSlides", NEWmadvLargeStepNumberOfSlides);
        madvLargeStepNumberOfSlides = NEWmadvLargeStepNumberOfSlides;
    }

    let NEWmadvWPMAdjustmentStep = document.getElementById("wpmadjustmentstep").value;
    if (!isNaN(NEWmadvWPMAdjustmentStep)) {
        await saveToLocal("madvWPMAdjustmentStep", NEWmadvWPMAdjustmentStep);
        madvWPMAdjustmentStep = NEWmadvWPMAdjustmentStep;
    }

    let NEWmadvBasicMinimumSlideDuration = document.getElementById("basicminimumslideduration").value;
    if (!isNaN(NEWmadvBasicMinimumSlideDuration)) {
        await saveToLocal("madvBasicMinimumSlideDuration", NEWmadvBasicMinimumSlideDuration);
        madvBasicMinimumSlideDuration = NEWmadvBasicMinimumSlideDuration;
    }

    let NEWmadvWordLengthMinimumSlideDuration = document.getElementById("wordlengthminimumslideduration").value;
    if (!isNaN(NEWmadvWordLengthMinimumSlideDuration)) {
        await saveToLocal("madvWordLengthMinimumSlideDuration", NEWmadvWordLengthMinimumSlideDuration);
        madvWordLengthMinimumSlideDuration = NEWmadvWordLengthMinimumSlideDuration;
    }

    // Word Frequency Algorithm Advanced Settings
    let NEWmadvWordFreqMinimumSlideDuration = document.getElementById("wordfreqminimumslideduration").value;
    if (!isNaN(NEWmadvWordFreqMinimumSlideDuration)) {
        await saveToLocal("madvWordFreqMinimumSlideDuration", NEWmadvWordFreqMinimumSlideDuration);
        madvWordFreqMinimumSlideDuration = NEWmadvWordFreqMinimumSlideDuration;
    }

    let NEWmadvWordFreqHighestFreqSlideDuration = document.getElementById("wordfreqhighestfreqslideduration").value;
    if (!isNaN(NEWmadvWordFreqHighestFreqSlideDuration)) {
        await saveToLocal("madvWordFreqHighestFreqSlideDuration", NEWmadvWordFreqHighestFreqSlideDuration);
        madvWordFreqHighestFreqSlideDuration = NEWmadvWordFreqHighestFreqSlideDuration;
    }

    let NEWmadvWordFreqLowestFreqSlideDuration = document.getElementById("wordfreqlowestfreqslideduration").value;
    if (!isNaN(NEWmadvWordFreqLowestFreqSlideDuration)) {
        await saveToLocal("madvWordFreqLowestFreqSlideDuration", NEWmadvWordFreqLowestFreqSlideDuration);
        madvWordFreqLowestFreqSlideDuration = NEWmadvWordFreqLowestFreqSlideDuration;
    }
    // end (Word Frequency Algorithm Advanced Settings)

    let NEWmadvAlwaysHideFocalGuide = document.getElementById("alwayshidefocalguide").checked;
    await saveToLocal("madvAlwaysHideFocalGuide", NEWmadvAlwaysHideFocalGuide);

    let NEWmadvOptimisedPositionLeftMarginPercent = document.getElementById("optleftmarginpercent").value;
    if (!isNaN(NEWmadvOptimisedPositionLeftMarginPercent)) {
        await saveToLocal("madvOptimisedPositionLeftMarginPercent", NEWmadvOptimisedPositionLeftMarginPercent);
        madvOptimisedPositionLeftMarginPercent = NEWmadvOptimisedPositionLeftMarginPercent;
    }

    let NEWmadvDisplaySentenceWhenPaused = document.getElementById("showsentence").checked;
    await saveToLocal("madvDisplaySentenceWhenPaused", NEWmadvDisplaySentenceWhenPaused);

    let NEWmadvAutoHideSentence = document.getElementById("autohidesentence").checked;
    await saveToLocal("madvAutoHideSentence", NEWmadvAutoHideSentence);

    let NEWmadvAutoHideSentenceSeconds = document.getElementById("autohidesentenceseconds").value;
    if (!isNaN(NEWmadvAutoHideSentenceSeconds)) {
        await saveToLocal("madvAutoHideSentenceSeconds", NEWmadvAutoHideSentenceSeconds);
        madvAutoHideSentenceSeconds = NEWmadvAutoHideSentenceSeconds;
    }

    let NEWmadvDisplaySentenceTopBorder = document.getElementById("showsentenceborder").checked;
    await saveToLocal("madvDisplaySentenceTopBorder", NEWmadvDisplaySentenceTopBorder);

    let NEWmadvDisplaySentenceAtReaderOpen = document.getElementById("sentencereaderopen").checked;
    await saveToLocal("madvDisplaySentenceAtReaderOpen", NEWmadvDisplaySentenceAtReaderOpen);

    let NEWmadvSentenceBackwardWordCount = document.getElementById("sentencebackwardwordcount").value;
    if (!isNaN(NEWmadvSentenceBackwardWordCount)) {
        await saveToLocal("madvSentenceBackwardWordCount", NEWmadvSentenceBackwardWordCount);
        madvSentenceBackwardWordCount = NEWmadvSentenceBackwardWordCount;
    }

    let NEWmadvSentencePositionPercentOffset = document.getElementById("sentencepositionpercentoffset").value;
    if (!isNaN(NEWmadvSentencePositionPercentOffset)) {
        await saveToLocal("madvSentencePositionPercentOffset", NEWmadvSentencePositionPercentOffset);
        madvSentencePositionPercentOffset = NEWmadvSentencePositionPercentOffset;
    }

    let NEWmadvDisplayProgress = document.getElementById("displayprogress").checked;
    await saveToLocal("madvDisplayProgress", NEWmadvDisplayProgress);

    let NEWmadvDisplaySocial = document.getElementById("displaysocial").checked;
    await saveToLocal("madvDisplaySocial", NEWmadvDisplaySocial);

    let NEWmadvDisplayWPMSummary = document.getElementById("displaywpmsummary").checked;
    await saveToLocal("madvDisplayWPMSummary", NEWmadvDisplayWPMSummary);

    let NEWmadvHotkeySelectionEnabled = document.getElementById("enableautotextselection").checked;
    await saveToLocal("madvHotkeySelectionEnabled", NEWmadvHotkeySelectionEnabled);

    let NEWmadvSaveSlidePosition = document.getElementById("saveslideposition").checked;
    await saveToLocal("madvSaveSlidePosition", NEWmadvSaveSlidePosition);

    alert("Please restart Sprint Reader for these changes to take effect");
}

function restoreMoreAdvancedSettings() {
    getMoreAdvancedSettingsDefaults();
    displayMoreAdvancedSettings();
    saveMoreAdvancedSettings();
}

function displayMoreAdvancedSettings() {
    // Display the more advanced settings on the screen
    document.getElementById("staticfocalunicode").value = madvStaticFocalUnicodeCharacter;

    if (madvEnableSpaceInsertion) {
        $("#enablespacecharacterinsertion").prop("checked", true);
    } else {
        $("#enablespacecharacterinsertion").removeAttr("checked");
    }

    if (madvRemoveLastSlideNullOrEmpty) {
        $("#removelastslideifnullorempty").prop("checked", true);
    } else {
        $("#removelastslideifnullorempty").removeAttr("checked");
    }

    if (madvEnableHyphenatedWordSplit) {
        $("#enabledhyphenatedwordsplit").prop("checked", true);
    } else {
        $("#enabledhyphenatedwordsplit").removeAttr("checked");
    }

    if (madvConsolidateHyphenatedWord) {
        $("#consolidatesinglehyphenatedword").prop("checked", true);
    } else {
        $("#consolidatesinglehyphenatedword").removeAttr("checked");
    }

    if (madvEnableLongWordHyphenation) {
        $("#enablehyphenationoflongerwords").prop("checked", true);
    } else {
        $("#enablehyphenationoflongerwords").removeAttr("checked");
    }

    document.getElementById("longwordcharactercounttrigger").value = madvLongWordTriggerCharacterCount;
    document.getElementById("longwordcharacterperslidecountpostsplit").value = madvLongWordMinCharacterPerSlidePostSplit;
    document.getElementById("longwordlastslidecharactercount").value = madvLongWordCharacterTriggerDoNotJoin;

    if (madvEnableAcronymDetection) {
        $("#enableacronymdetection").prop("checked", true);
    } else {
        $("#enableacronymdetection").removeAttr("checked");
    }

    if (madvEnableNumberDecimalDetection) {
        $("#enablenumberanddecimaldetection").prop("checked", true);
    } else {
        $("#enablenumberanddecimaldetection").removeAttr("checked");
    }

    if (madvDeleteEmptySlides) {
        $("#deleteemtpyslides").prop("checked", true);
    } else {
        $("#deleteemtpyslides").removeAttr("checked");
    }

    document.getElementById("wpmadjustmentstep").value = madvWPMAdjustmentStep;
    document.getElementById("basicminimumslideduration").value = madvBasicMinimumSlideDuration;
    document.getElementById("wordlengthminimumslideduration").value = madvWordLengthMinimumSlideDuration;

    document.getElementById("wordfreqminimumslideduration").value = madvWordFreqMinimumSlideDuration;
    document.getElementById("wordfreqhighestfreqslideduration").value = madvWordFreqHighestFreqSlideDuration;
    document.getElementById("wordfreqlowestfreqslideduration").value = madvWordFreqLowestFreqSlideDuration;

    if (madvAlwaysHideFocalGuide) {
        $("#alwayshidefocalguide").prop("checked", true);
    } else {
        $("#alwayshidefocalguide").removeAttr("checked");
    }

    document.getElementById("optleftmarginpercent").value = madvOptimisedPositionLeftMarginPercent;

    if (madvDisplaySentenceWhenPaused) {
        $("#showsentence").prop("checked", true);
    } else {
        $("#showsentence").removeAttr("checked");
    }

    if (madvAutoHideSentence) {
        $("#autohidesentence").prop("checked", true);
    } else {
        $("#autohidesentence").removeAttr("checked");
    }

    if (madvDisplaySentenceTopBorder) {
        $("#showsentenceborder").prop("checked", true);
    } else {
        $("#showsentenceborder").removeAttr("checked");
    }

    if (madvDisplaySentenceAtReaderOpen) {
        $("#sentencereaderopen").prop("checked", true);
    } else {
        $("#sentencereaderopen").removeAttr("checked");
    }

    if (madvDisplayProgress) {
        $("#displayprogress").prop("checked", true);
    } else {
        $("#displayprogress").removeAttr("checked");
    }

    if (madvDisplaySocial) {
        $("#displaysocial").prop("checked", true);
    } else {
        $("#displaysocial").removeAttr("checked");
    }

    if (madvDisplayWPMSummary) {
        $("#displaywpmsummary").prop("checked", true);
    } else {
        $("#displaywpmsummary").removeAttr("checked");
    }

    document.getElementById("autohidesentenceseconds").value = madvAutoHideSentenceSeconds;
    document.getElementById("sentencepositionpercentoffset").value = madvSentencePositionPercentOffset;
    document.getElementById("largestepnumberofslides").value = madvLargeStepNumberOfSlides;

    if (madvHotkeySelectionEnabled) {
        $("#enableautotextselection").prop("checked", true);
    } else {
        $("#enableautotextselection").removeAttr("checked");
    }

    if (madvSaveSlidePosition) {
        $("#saveslideposition").prop("checked", true);
    } else {
        $("#saveslideposition").removeAttr("checked");
    }
}

document.addEventListener("DOMContentLoaded", init, false);