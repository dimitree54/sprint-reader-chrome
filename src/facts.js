//------------------------------------------------------------------------------
//
// 	SPRINT READER
//	Speed Reading Extension for Google Chrome
//	Copyright (c) 2013-2024, Anthony Nosek
//	https://github.com/anthonynosek/sprint-reader-chrome/blob/master/LICENSE
//
//------------------------------------------------------------------------------

// Did you know?
// These functions display a fun fact about the selected reading speed
const factArray = [];
const strWPM = "##WPM##";
const strDuration = "##DURATION##";

function writeFact(wpm) {
    // Write a fact to the screen
    const index = Math.floor(Math.random() * factArray.length);
    const fact = factArray[index];

    if (!fact) return;

    const divFact = document.getElementById("fact");
    const divDisclaimer = document.getElementById("disclaimer");
    divDisclaimer.innerHTML = fact.disclaimer;

    // calculate the stats
    let factText = fact.fact;
    const duration = fact.wordcount / wpm;

    // Add the WPM (if applicable for the fact)
    factText = factText.replace(strWPM, wpm);

    let durationText;
    if (duration <= 180) {
        durationText = `${Math.round(duration)} minutes`;
    } else if (duration <= 48 * 60) {
        durationText = `${(duration / 60).toFixed()} hours`;
    } else if (duration <= 370 * 24) {
        durationText = `${(duration / (24 * 60)).toFixed()} days`;
    } else {
        durationText = `${(duration / (365 * 24 * 60)).toFixed()} years`;
    }

    factText = factText.replace(strDuration, durationText);
    divFact.innerHTML = factText;
}

function buildFactArray() {
    // Every object has the following properties
    // obj.wordcount
    // obj.fact
    // obj.disclaimer

    // Add contents to the fact array that we will use in the program
    const facts = [
        {
            wordcount: 47094,
            fact: `It would take you approximately <b>${strDuration}</b> to read F. Scott Fitzgerald's <b>The Great Gatsby</b> at your current words per minute (WPM)! How does that make you feel?`,
            disclaimer: "Disclaimer: This is a true and fun fact."
        },
        {
            wordcount: 0,
            fact: "Legendary US basketballer Shaquille O'Neal can read at over <b>2,000 words per minute</b> with up to 85% accuracy using the rapid serial visual presentation (RSVP) method of reading.",
            disclaimer: "Disclaimer: We have no idea if this is true, it's probably false!"
        },
        {
            wordcount: 884421,
            fact: `Want to read Shakespeare? How about reading his entire collected works? At <b>${strWPM}</b> words per minute you could read the entire collection in <b>${strDuration}</b>!`,
            disclaimer: "Disclaimer: This is true, the collected works of Shakespeare comprises 884,421 words."
        },
        {
            wordcount: 25783,
            fact: `At <b>${strWPM}</b> words per minute it will take you <b>${strDuration}</b> to read <b>Romeo and Juliet</b> by Shakespeare!`,
            disclaimer: "Disclaimer: True, Romeo and Juliet contains 25,783 words."
        },
        {
            wordcount: 587287,
            fact: `You could read <b>War and Peace</b> from cover to cover in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: Leo Tolstoy's War and Peace comprises 587,287 words."
        },
        {
            wordcount: 73404,
            fact: `With total book sales of more than 65 million and with over 250,000 copies being sold each year you could read J.D Sallinger's 1951 classic <b>The Catcher in the Rye</b> in <b>${strDuration}</b>!`,
            disclaimer: "Disclaimer: The Catcher in the Rye contains 73,404 words."
        },
        {
            wordcount: 49459,
            fact: `In <b>${strDuration}</b> at your current rate of <b>${strWPM}</b> words per minute you could read <b>Slaughterhouse-Five</b> by Kurt Vonnegut.`,
            disclaimer: "Disclaimer: Slaughterhouse-Five contains 49,459 words."
        },
        {
            wordcount: 1200000,
            fact: `Touted as one of the longest novels in existence <b>In Search of Lost Time</b> or <b>Remembrance of Things Past</b> by Marcel Proust contains approx 1.2 million words. At your current reading rate you could finish all 7 volumes in <b>${strDuration}</b>. A little long for a relaxing Sunday afternoon read!`,
            disclaimer: "Disclaimer: The estimated word count for 'In Search of Lost Time' is ~1,200,000."
        },
        {
            wordcount: 85199,
            fact: `You could read <b>The Unbearable Lightness of Being</b> by Milan Kundera from cover to cover in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: The Unbearable Lightness of Being contains 85,199 words."
        },
        {
            wordcount: 88942,
            fact: `You could read <b>Nineteen Eighty-Four</b> by George Orwell from cover to cover in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: George Orwell's Nineteen Eighty-Four comprises 88,942 words."
        },
        {
            wordcount: 733023,
            fact: `Feel like reading a trilogy? At <b>${strWPM}</b> words per minute you could read <b>Lord of the Rings</b>, all three books by J. R. R. Tolkien in <b>${strDuration}</b>. Now that sounds like a perfect way to relax!`,
            disclaimer: "Disclaimer: For the nerds, The Lord of the Rings – 455,125 words, The Two Towers – 143,436 words and The Return of the King – 134,462 words."
        },
        {
            wordcount: 1084625,
            fact: `Attention Harry Potter fans! You could read the entire Harry Potter series (all seven books by J.K. Rowling) in <b>${strDuration}</b>. The entire series comprises 1,084,625 words which is a lot of text, luckiliy the story is very enthralling!`,
            disclaimer: "Disclaimer: Book|Words = 1|77,325, 2|84,799, 3|106,821, 4|190,858, 5|257,154, 6|169,441, 7|198,227."
        },
        {
            wordcount: 116277,
            fact: `At your current rate of <b>${strWPM}</b> words per minute you could read <b>On the Road</b> by Jack Kerouac in <b>${strDuration}</b>.`,
            disclaimer: "Disclaimer: On the Road contains approx 116,000 words."
        },
        {
            wordcount: 174269,
            fact: `At your current rate of <b>${strWPM}</b> words per minute you could read <b>Catch-22</b> by Joseph Heller in <b>${strDuration}</b>.`,
            disclaimer: "Disclaimer: Catch-22 contains 174,269 words."
        },
        {
            wordcount: 211591,
            fact: `At your current rate of <b>${strWPM}</b> words per minute you could read <b>Crime and Punishment</b> by Fyodor Dostoyevsky in <b>${strDuration}</b>.`,
            disclaimer: "Disclaimer: Crime and Punishment contains 211,591 words."
        },
        {
            wordcount: 135420,
            fact: `You could read <b>A Tale of Two Cities</b> by Charles Dickens in <b>${strDuration}</b>. That's so long as you read at <b>${strWPM}</b> words per minute for the whole book!`,
            disclaimer: "Disclaimer: A Tale of Two Cities contains 135,420 words."
        },
        {
            wordcount: 0,
            fact: `Former British prime minister Winston Churchill could read 1600+ words per minute using the rapid serial visualisation presentation method of reading! You are currently reading selected text at <b>${strWPM}</b> words per minute.`,
            disclaimer: "Disclaimer: We have no idea if this is true, it's probably false!"
        },
        {
            wordcount: 21810,
            fact: `You could read <b>The Metamorphosis</b> by Franz Kafka from cover to cover in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: The Metamorphosis contains 21,810 words."
        },
        {
            wordcount: 84114,
            fact: `You could read <b>The Trial</b> by Franz Kafka from cover to cover in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: The Trial contains 84,114 words."
        },
        {
            wordcount: 264861,
            fact: `You could read <b>Ulysses</b> by James Joyce in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: Ulysses contains 264,861 words."
        },
        {
            wordcount: 35968,
            fact: `<b>Old Yeller</b> is a 1956 children's novel by Fred Gipson. You could read this classic in <b>${strDuration}</b> at your current reading rate of <b>${strWPM}</b> words per minute!`,
            disclaimer: "Disclaimer: Old Yeller contains 35,968 words."
        },
        {
            wordcount: 63604,
            fact: `<b>The Scarlet Letter</b> is a romantic novel written in 1850 by Nathaniel Hawthorne. At your current reading rate of <b>${strWPM}</b> words per minute you could 'absorb' this entire romantic text in <b>${strDuration}</b>! Sounds romantic doesn't it?`,
            disclaimer: "Disclaimer: The Scarlet Letter contains 63,604 words."
        }
    ];

    factArray.push(...facts);
}