import { formatCSV, parseCSV } from "../csv.js";
import { cleanCSVPath, mergedCSVPath } from "../paths.js";
import { ExternalPartyRow } from "../types.js";

const getNextRows = parseCSV(cleanCSVPath)

const rows: ExternalPartyRow[] = []
let chunk: ExternalPartyRow[] = await getNextRows()
while(chunk.length) {
    rows.push(...chunk)
    chunk = await getNextRows()
}

console.log(`Loaded`, rows.length, `rows into memory; Processing...`)

console.info(`Processing duplicate IBANs`)
console.time("iban")
// first thing, process iban and make groupment
{
    const ibans: Record<string, number> = {}
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i]

        if(!row.party_iban)continue

        if(row.party_iban in ibans) {
            row.assigned_id = rows[ibans[row.party_iban]].assigned_id
            continue
        }

        ibans[row.party_iban] = i
    }
}
console.timeEnd("iban")
console.log(`Iban processed ! Processing phone numbers...`)

console.time("phone")
{
    const phones: Record<string, number> = {}
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i]

        if(!row.clean_phone)continue

        if(row.clean_phone in phones) {
            row.assigned_id = rows[phones[row.clean_phone]].assigned_id
            continue
        }

        phones[row.clean_phone] = i
    }
}
console.timeEnd("phone")
console.log(`Phone processed ! Now processing the names...`)

console.time("~fields")
{
    // score threshold
    const threshold_levenshtein = 2
    const threshold_pass = 4
    const weights = {
        parsed_address_street_name: 0,
        parsed_address_street_number: 0,
        parsed_address_unit: 0,
        parsed_address_postal_code: 0,
        parsed_address_city: 0,
        parsed_address_state: 2,
        parsed_address_country: 1,
        clean_name: 10,
    }
    const fields: Partial<
        Record<keyof ExternalPartyRow, Record<
            string,
            number[]
        >>
    > = Object.fromEntries(
        // don't ask questions !
        // i hate shitcoding but this is the most efficient way
        Object.entries(weights)
            .map(([k]) => [k, {}])
    )
    const fieldsKeys = Object.keys(fields) as (keyof typeof fields)[]

    // fill the objects with the data
    console.log(`Filling the data in fields...`)
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]

        for (const key of fieldsKeys) {
            const value = row[key]!
            // ignore empty fields
            if(!value)continue
            const map = fields[key]!

            map[value] ??= []
            map[value].push(i)
        }
    }
    console.info(`Maps are filled ! Now looking at the fields.`)

    for (let i = 0; i < rows.length; i++) {
        console.time(`i-`+i)
        const row = rows[i]

        const scores: Record<number, number> = {}
        for (const key of fieldsKeys) {
            const value = row[key]!
            // ignore empty fields
            if(!value)continue

            const map = fields[key]!
            
            const equals = map[value] ?? []

            for (const target_i of equals) {
                // only target rows that are after this one.
                if(target_i <= i)continue
                const target_row = rows[target_i]
                // we don't care, already in the group.
                if(target_row.assigned_id === row.assigned_id)continue

                scores[target_i] ??= 0

                // this is linear score, we should probably weight it
                // a country is less important than a street name / street number / city / postal code
                scores[target_i] += 1
            }
        }

        for (const [i, score] of Object.entries(scores)) {
            // ignore this score
            if(score < threshold_levenshtein)continue

            if (score < threshold_pass) {
                // apply levenshtein
                // npm i fast-levenshtein
            }

            // javascript objects store keys as string
            // need to parse it
            // TODO: Potentially migrate to Map ? maybe faster ?
            const target_row = rows[parseInt(i)]
            // console.log(`Score`, score, `Linking`, [row.party_info_unstructured], `and`, [target_row.party_info_unstructured])
            target_row.assigned_id = row.assigned_id
        }

        console.timeEnd(`i-`+i)
    }
}
console.timeEnd("~fields")

console.info(`Saving rows to merged.csv...`)
console.time("save")
const writeStream = formatCSV(mergedCSVPath)
for (const row of rows) {
    writeStream.write(row)
}
console.timeEnd("save")
console.log(`Finished merging rows !`)