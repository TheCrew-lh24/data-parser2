import countries from "./countries.json" with { type: "json" }

const entries = Object.entries(countries)

export const indicators: string[] = [];
for (const [, country] of entries) {
    for (const phone of country.phone) {
        indicators.push(phone.toString());
    }
}
indicators.sort((a, b) => b.length - a.length);