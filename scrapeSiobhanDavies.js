const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// Map of Season Names to Dates
const seasonDates = {
    "Summer 2025": {
        start: "2025-06-01",
        end: "2025-08-31"
    },
    "Autumn 2025": {
        start: "2025-09-01",
        end: "2025-12-31"
    }
};

const scrapeSiobhanDavies = async () => {
    const url = 'https://www.siobhandavies.com/events/classes-2/'; // Hardcoded URL for Siobhan Davies
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const danceClasses = [];

        // A helper function to process class sections
        const processSection = (selector) => {
            let currentDay = null;
            // Find the section and iterate through all elements
            const section = $(selector);
            let currentElement = section.next();
            while (currentElement.length && !currentElement.is('h2')) {
                // Check if this is a day header (h3 with day names)
                if (currentElement.is('h3')) {
                    const dayText = currentElement.text().trim();
                    if (/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?$/i.test(dayText)) {
                        currentDay = dayText.replace(/s$/, ''); // Remove trailing 's' if present
                        console.log('Found day:', currentDay);
                    }
                }
                // Check if this element contains a class (look for h4 with class titles)
                const h4 = currentElement.find('h4');
                let classTitle = '';
                if (h4.length) {
                    const strong = h4.find('strong');
                    if (strong.length) {
                        classTitle = strong.first().text().trim();
                    } else {
                        classTitle = h4.first().text().trim();
                    }
                }
                if (classTitle) {
                    const details = currentElement.find('p').first().text().trim();
                    // Extract time from the text content
                    const text = currentElement.text();
                    const timeMatch = text.match(/(\d{1,2}(?:\.\d{1,2})? ?[ap]m? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?|\d{1,2}(?:\.\d{1,2})? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?)/i);
                    const time = timeMatch ? timeMatch[0].replace(/\s+/g, ' ').trim() : null;
                    const link = currentElement.find('a').attr('href');
                    // Determine season dates based on details
                    let startDate = null;
                    let endDate = null;
                    for (const [seasonName, dates] of Object.entries(seasonDates)) {
                        if (details && details.includes(seasonName)) {
                            startDate = dates.start;
                            endDate = dates.end;
                            break;
                        }
                    }
                    console.log('Found class:', classTitle, 'on day:', currentDay);
                    danceClasses.push({
                        title: classTitle,
                        details,
                        day: currentDay,
                        time,
                        schedule: "weekly",
                        startDate,
                        endDate,
                        link: link ? new URL(link, url).href : null
                    });
                }
                currentElement = currentElement.next();
            }
        };

        // Process adult
        processSection('h2:contains("Adult dance classes")');

        return danceClasses;

    } catch (error) {
        console.error('Error scraping Siobhan Davies:', error);
        return [];
    }
};

module.exports = scrapeSiobhanDavies; 