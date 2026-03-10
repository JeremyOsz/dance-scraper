const fs = require('fs');
const scrapeSiobhanDavies = require('./scrapeSiobhanDavies');
const scrapeThePlace = require('./scrapeThePlace');
const scrapeRambert = require('./scrapeRambert');

const main = async () => {
    const siobhanDaviesClasses = await scrapeSiobhanDavies();
    const thePlaceClasses = await scrapeThePlace();
    const rambertClasses = await scrapeRambert();
    
    // Create the final object with all datasets
    const output = {
        siobhanDavies: siobhanDaviesClasses,
        thePlace: thePlaceClasses,
        rambert: rambertClasses
    };
    
    // Write the data to a JSON file
    fs.writeFileSync('classes.json', JSON.stringify(output, null, 2));
    console.log('Scraping complete! Data has been saved to classes.json');
};

main();