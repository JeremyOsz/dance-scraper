# Dance Scraper

A Node.js web scraper that extracts dance class information from multiple dance studios in London.

## Features

- **Multi-studio scraping**: Currently scrapes from Siobhan Davies Studios and The Place
- **Structured data extraction**: Extracts class titles, details, days, times, and booking links
- **JSON output**: Saves all data in a structured JSON format
- **Debug logging**: Console output to track scraping progress

## Supported Studios

### Siobhan Davies Studios
- **URL**: https://www.siobhandavies.com/events/classes-2/
- **Data extracted**: Adult dance classes with day, title, details, time, and booking links

### The Place
- **URL**: https://theplace.org.uk/dance/classes-and-courses?levels=%5BLevel%5D&styles=%5BStyle%5D&ages=%5BAdult%5D
- **Data extracted**: Adult dance classes with day, title, details, time, and booking links

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dance-scraper
```

2. Install dependencies:
```bash
npm install
```

## Usage

Run the scraper:
```bash
node scraper.js
```

The scraper will:
1. Scrape Siobhan Davies Studios classes
2. Scrape The Place classes
3. Combine both datasets into `classes.json`
4. Save raw HTML from The Place to `theplace-raw.html` for debugging

## Output Format

The scraper generates a `classes.json` file with the following structure:

```json
{
  "siobhanDavies": [
    {
      "title": "MONDAY NIGHT IMPROVISATION",
      "details": "Programmed by Independent Dance. Open to all. Teacher changes weekly.",
      "day": "Monday",
      "time": "6.30 – 8pm",
      "link": "https://www.siobhandavies.com/classes/id-improvisation/"
    }
  ],
  "thePlace": [
    {
      "title": "Contemporary Beginners with Leanne Lieberhong",
      "details": "Summer 2025",
      "day": "Saturday",
      "time": null,
      "link": "https://theplace.org.uk/..."
    }
  ]
}
```

## Data Fields

Each class entry contains:
- **title**: Name of the dance class
- **details**: Description, teacher, or additional information
- **day**: Day of the week (Monday, Tuesday, etc.)
- **time**: Class time (if available)
- **link**: Booking or information link

## Dependencies

- **axios**: HTTP client for making requests
- **cheerio**: Server-side jQuery implementation for HTML parsing
- **fs**: Node.js file system module (built-in)

## Development

### Adding New Studios

To add a new dance studio:

1. Create a new scraping function following the pattern of `scrapeSiobhanDavies()` or `scrapeThePlace()`
2. Add the function call to the `main()` function
3. Update the output structure to include the new studio's data

### Debugging

- The scraper includes console logging to track progress
- Raw HTML from The Place is saved to `theplace-raw.html` for inspection
- Check the console output for any parsing errors

## Notes

- The scraper uses static HTML parsing with cheerio, so it may not work with JavaScript-heavy sites
- Some studios may require a headless browser (Puppeteer/Playwright) for dynamic content
- The scraper is designed for educational purposes and should respect robots.txt and rate limiting

## License

This project is for educational purposes. Please respect the terms of service of the websites being scraped. 