const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs'); // Import the File System module

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
                const classTitle = h4.length ? h4.first().clone().children().remove().end().text().trim() : '';
                if (classTitle) {
                    const details = currentElement.find('p').first().text().trim();
                    // Extract time from the text content
                    const text = currentElement.text();
                    const timeMatch = text.match(/(\d{1,2}(?:\.\d{1,2})? ?[ap]m? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?|\d{1,2}(?:\.\d{1,2})? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?)/i);
                    const time = timeMatch ? timeMatch[0].replace(/\s+/g, ' ').trim() : null;
                    const link = currentElement.find('a').attr('href');
                    
                    console.log('Found class:', classTitle, 'on day:', currentDay);
                    
                    danceClasses.push({
                        title: classTitle,
                        details,
                        day: currentDay,
                        time,
                        link: link ? new URL(link, url).href : null
                    });
                }
                
                currentElement = currentElement.next();
            }
        };

        // Process adult
        processSection('h2:contains("Adult dance classes")');

        // Create the final object with the desired key
        const output = {
            siobhanDavies: danceClasses
        };

        // Write the data to a JSON file
        fs.writeFileSync('classes.json', JSON.stringify(output, null, 2));
        console.log('Scraping complete! Data has been saved to classes.json');

    } catch (error) {
        console.error('Error scraping the URL:', error);
    }
};

const scrapeThePlace = async () => {
    const url = 'https://theplace.org.uk/dance/classes-and-courses?levels=%5BLevel%5D&styles=%5BStyle%5D&ages=%5BAdult%5D';
    try {
        const { data } = await axios.get(url);
        // Write the raw HTML to a file for inspection
        fs.writeFileSync('theplace-raw.html', data);
        const $ = cheerio.load(data);
        const classes = [];

        // Scrape event cards for class info
        const eventCards = $(".c-event-card__header").closest('a');
        eventCards.each((i, el) => {
            const dayText = $(el).find('.c-event-card__header').first().text().trim();
            const day = dayText ? dayText.replace(/s$/, '') : null;
            const title = $(el).find('.c-event-card__title').first().text().trim();
            const details = $(el).find('.c-event-card__subtitle').first().text().trim();
            const dateText = $(el).find('.c-event-card__date').first().text().trim();
            // Try to extract time from dateText (if present)
            let time = null;
            if (dateText) {
                const timeMatch = dateText.match(/(\d{1,2}(?:\.\d{1,2})? ?[ap]m? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?|\d{1,2}(?:\.\d{1,2})? ?[–-] ?\d{1,2}(?:\.\d{1,2})? ?[ap]m?)/i);
                if (timeMatch) {
                    time = timeMatch[0].replace(/\s+/g, ' ').trim();
                }
            }
            let link = $(el).attr('href');
            if (link && !link.startsWith('http')) {
                link = 'https://theplace.org.uk' + link;
            }
            if (title) {
                classes.push({
                    title,
                    details,
                    day,
                    time,
                    link: link || null
                });
            }
        });
        return classes;
    } catch (error) {
        console.error('Error scraping The Place:', error);
        return [];
    }
};

const main = async () => {
    await scrapeSiobhanDavies();
    const thePlaceClasses = await scrapeThePlace();
    // Read the existing file (created by scrapeSiobhanDavies)
    let output = {};
    try {
        output = JSON.parse(fs.readFileSync('classes.json', 'utf-8'));
    } catch {}
    output.thePlace = thePlaceClasses;
    fs.writeFileSync('classes.json', JSON.stringify(output, null, 2));
    console.log('The Place scraping complete! Data has been added to classes.json');
};

main();