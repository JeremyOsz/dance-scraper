const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

// TODO:
// - Add the time to the classes
// - Add the day to the classes
// - Add the link to the classes
// - Add the details to the classes
// - Add the title to the classes
// - Add the schedule to the classes
// Parse Summer Intensives
// Mark season dates

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
                    schedule: "weekly",
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

module.exports = scrapeThePlace; 