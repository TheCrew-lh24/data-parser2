import { indicators } from "../countries.js";
import { formatCSV, parseCSV } from "../csv.js";
import { cleanCSVPath, externalPartiesTrainPath } from "../paths.js";
import { ExternalPartyRow } from "../types.js";

const getNextRows = parseCSV(externalPartiesTrainPath)
const writeStream = formatCSV(cleanCSVPath)

let rows: ExternalPartyRow[] = await getNextRows()
let rowCount = 0
while(rows.length) {
    for(const row of rows) {
        rowCount++
        // make sure row got every field
        row.transaction_reference_id ??= ""
        row.party_role ??= ""
        row.party_info_unstructured ??= ""
        row.parsed_name ??= ""
        row.parsed_address_street_name ??= ""
        row.parsed_address_street_number ??= ""
        row.parsed_address_unit ??= ""
        row.parsed_address_postal_code ??= ""
        row.parsed_address_city ??= ""
        row.parsed_address_state ??= ""
        row.parsed_address_country ??= ""
        row.party_iban ??= ""
        row.party_phone ??= ""
        row.external_id ??= ""
        row.clean_phone ??= ""
        row.phone_indicator ??= ""
        row.parsed_titles ??= ""
        row.abbreviated_name ??= ""
        row.clean_name ??= ""

        row.id = rowCount.toString()
        row.assigned_id = rowCount.toString()
        
        // ---- START NAME ---
        let name = row.parsed_name;
        if (name) {
            name = name.replace(/, */g, " ");
    
            // identify titles (mrs, mr, dr, ...) from the parsed name, currently we guess that anything with 2 or more letters followed by a dot is a title
            const titles = [];
            titles: {
                const matches = name.matchAll(/\w{2,}\./g);
                if (!matches) break titles;
    
                for (const match of matches) {
                    titles.push(match[0]);
                    // make a clean name
                    name = name.replace(match[0], "");
                }
            }
            row.parsed_titles = titles.sort().join();
    
            // make every dot that doesn't follow with a space to follow with a space (e.g "jr.jr." becomes "jr. jr."), that way dedupe works
            name = name.trim().replace(/\.([^ ])/g, ". $1");
    
            // dedupe name (e.g. "john john doe" becomes "john doe")
            const name_words = name.trim().split(/ +/g);
            for (let i = 0; i < name_words.length; ) {
                const word = name_words[i];
    
                if (name_words.indexOf(word) == i - 1) {
                    // console.log(`Removing duplicate word`, [word], "from", [name])
                    name_words.splice(i, 1);
                    continue;
                }
    
                // some entries end with iii
                if (word === "i".repeat(word.length)) {
                    name_words.splice(i, 1);
                    continue;
                }
    
                i++;
            }
    
            name = name_words.join(" ");
            row.clean_name = name;
    
            /*
                create abbreviated_name (e.g. "John Doe" becomes "J. Doe")
                that way we can make it so that "john doe" == "juhn doe" indirectly, we do lose some accuracy but we hope to win some
            */
            
            if(name_words.length){
                // could potentially use name_words but i'm recreating it
                // to avoid more bugs if I change name_words
                row.abbreviated_name = name_words[0][0] + ". " + name.slice(name_words[0].length + 1)
            }
        }
        // ---- END NAME ---
    
        // ---- START PHONE ---
        row.phone_indicator = "";
        let phone = row.party_phone;
        if (phone) {
            phone = phone.replace(/[^\d]/g, ""); // remove all non digits and plus to clean up (this does not seem to induce false positives after comparing removing different stuff or not)
            phone = phone.replace(/^0+/, "+"); // replace leading zeros with a plus (e.g 0039 or +0039 becomes +39)
    
            // Add a plus sign at the beginning if it's missing
            if (phone[0] !== "+") {
                phone = "+" + phone;
            }
            // results.push(phone)
    
            // rows[phone] ??= []
            // rows[phone].push([
            //     row.parsed_name,
            //     row.parsed_address_street_name,
            //     row.parsed_address_city,
            //     row.parsed_address_country
            // ])
    
            row.clean_phone = phone;
            // Identify the phone indicator by checking if the phone starts with any of the known valid country indicators
            let phone_indicator;
            for (const indicator of indicators) {
                if (phone.slice(1, indicator.length + 1) === indicator) {
                    phone_indicator = indicator;
                    break;
                }
            }
    
            // if(!phone_indicator){
            //     console.warn(`PHONE NUMBER ${phone} DOES NOT HAVE AN INDICATOR`)
            // }
    
            row.phone_indicator = phone_indicator ?? "";
        }
        // ---- END PHONE ---
    
        writeStream.write(row)
    }

    rows = await getNextRows()
}