const fs = require('fs');
const scrapeSiobhanDavies = require('./scrapeSiobhanDavies');
const scrapeThePlace = require('./scrapeThePlace');

const main = async () => {
    const siobhanDaviesClasses = await scrapeSiobhanDavies();
    const thePlaceClasses = await scrapeThePlace();
    
    // Create the final object with both datasets
    const output = {
        siobhanDavies: siobhanDaviesClasses,
        thePlace: thePlaceClasses
    };
    
    // Write the data to a JSON file
    fs.writeFileSync('classes.json', JSON.stringify(output, null, 2));
    console.log('Scraping complete! Data has been saved to classes.json');
};

main();