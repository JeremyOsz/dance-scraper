const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const scrapeRambert = async () => {
    const url = 'https://rambert.org.uk/classes/';
    try {
        const { data } = await axios.get(url);
        // Write the raw HTML to a file for inspection
        fs.writeFileSync('rambert-raw.html', data);
        const $ = cheerio.load(data);
        const classes = [];

        // Find class cards/items on the page
        // Looking for elements that contain class information
        $('div, article, section').each((i, el) => {
            const $el = $(el);
            
            // Look for elements that contain class titles and times
            const titleElement = $el.find('h1, h2, h3, h4, h5, h6').first();
            const title = titleElement.text().trim();
            
            // Skip if no title or if it's a page header
            if (!title || title.toLowerCase().includes('classes') || title.length < 3) {
                return;
            }
            
            // Extract time from the text content
            const text = $el.text();
            const timeMatch = text.match(/(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
            const time = timeMatch ? timeMatch[1] : null;
            
            // Extract day from the text
            let day = null;
            const dayMatch = text.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
            if (dayMatch) {
                day = dayMatch[1];
            }
            
            // Look for booking link
            const bookingLink = $el.find('a[href*="book"], a:contains("BOOK")').attr('href');
            let link = null;
            if (bookingLink) {
                link = bookingLink.startsWith('http') ? bookingLink : `https://rambert.org.uk${bookingLink}`;
            }
            
            // Extract details/description
            const details = $el.find('p').first().text().trim();
            
            // Only add if we have a meaningful title and time
            if (title && time && !classes.some(c => c.title === title && c.time === time)) {
                classes.push({
                    title,
                    details: details || null,
                    day,
                    time,
                    schedule: "weekly",
                    startDate: null, // Rambert doesn't show specific date ranges
                    endDate: null,
                    link
                });
            }
        });

        console.log(`Rambert: Found ${classes.length} classes`);
        return classes;
    } catch (error) {
        console.error('Error scraping Rambert:', error);
        return [];
    }
};

module.exports = scrapeRambert; 