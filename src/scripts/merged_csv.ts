import { formatCSV, parseCSV } from "../csv.js";
import { cleanCSVPath, mergedCSVPath } from "../paths.js";
import { f1Score } from "../stats.js";
import { ExternalPartyRow } from "../types.js";
// import { Minhash, LshIndex } from "minhash";
// import Levenshtein from "fast-levenshtein";

const getNextRows = parseCSV(cleanCSVPath)

const rows: ExternalPartyRow[] = []
let chunk: ExternalPartyRow[] = await getNextRows()
while(chunk.length) {
    rows.push(...chunk)
    chunk = await getNextRows()
}

console.log(`Loaded`, rows.length, `rows into memory; Processing...`)

const assigned_ids: Record<string, number[]> = {}
console.info(`Processing duplicate IBANs`)
console.time("iban")
// first thing, process iban and make groupment
{
    const ibans: Record<string, number> = {}
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i]

        if(!row.party_iban){
            assigned_ids[row.assigned_id!] = [i]
            continue
        }

        if(row.party_iban in ibans) {
            row.assigned_id = rows[ibans[row.party_iban]].assigned_id
            assigned_ids[row.assigned_id!].push(i)
            continue
        }

        ibans[row.party_iban] = i
        assigned_ids[row.assigned_id!] = [i]
    }
}
console.timeEnd("iban")
console.log(`Iban processed ! Processing phone numbers...`)

console.time("phone")
{
    const phone_len_threshold = 7
    const phones: Record<string, number> = {}
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i]

        if(!row.clean_phone)continue

        for(let len = row.clean_phone.length; len >= Math.min(phone_len_threshold, row.clean_phone.length); len--) {
            const phone = row.clean_phone.slice(-len)
            // console.log(row.assigned_id, phone)

            if(phone in phones) {
                const old_id = row.assigned_id!
                // console.log(phone, phones[phone])
                const new_id = rows[phones[phone]].assigned_id!
                if (old_id === new_id) continue
    
                for (const i of assigned_ids[old_id]) {
                    // console.log(`Merging row id`, new_id, `with rows`, old_id)
                    rows[i].assigned_id = new_id
                }
                assigned_ids[new_id].push(...assigned_ids[old_id])
    
                delete assigned_ids[old_id]
    
                continue
            }

            // console.log(`Setting`, phone, `to`, i)
            phones[phone] = i
            continue
        }
    }
}
console.timeEnd("phone")
console.log(`Phone processed ! Now processing the names...`)

console.time("streetname-name")
{
    const matches: Record<string, number> = {}
    for(let i = 0; i < rows.length; i++) {
        const row = rows[i]

        const payloads = []
        if (row.parsed_address_street_name && row.abbreviated_name) {
            payloads.push(`${row.parsed_address_street_name}:${row.abbreviated_name}`)
        }
        if (row.parsed_address_city && row.parsed_address_postal_code) {
            payloads.push(`${row.parsed_address_city}:${row.parsed_address_postal_code}`)
        }
        // if (row.parsed_address_city && row.parsed_address_state) {
        //     payloads.push(`${row.parsed_address_city}:${row.parsed_address_postal_code}`)
        // }
        // if (row.parsed_address_street_name && row.parsed_address_country) {
        //     payloads.push(`${row.parsed_address_street_name}:${row.parsed_address_country}`)
        // }
        // if (row.parsed_address_street_name && row.parsed_address_state) {
        //     payloads.push(`${row.parsed_address_street_name}:${row.parsed_address_state}`)
        // }
        // if(row.clean_name) {
        //     payloads.push(row.clean_name)
        // }
        
        for (const match of payloads) {
            if(match in matches) {
                const old_id = row.assigned_id!
    
                const new_id = rows[matches[match]].assigned_id!
                if (old_id === new_id) continue
    
                if (assigned_ids[new_id].length > 1 && assigned_ids[old_id].length > 1)continue
    
                for (const i of assigned_ids[old_id]) {
                    rows[i].assigned_id = new_id
                }
                assigned_ids[new_id].push(...assigned_ids[old_id])
    
                delete assigned_ids[old_id]
    
                continue
            }
    
            // console.log(`Setting`, phone, `to`, i)
            matches[match] = i
        }
    }
}
console.timeEnd("streetname-name")


// console.time("clean_name")
// {
//     const threshold_levenshtein = 2
//     const matches: Record<string, number[]> = {}
//     for(let i = 0; i < rows.length; i++) {
//         const row = rows[i]

//         if(!row.clean_name)continue

//         matches[row.clean_name] ??= []
//         matches[row.clean_name].push(i)
//     }

//     for(let i = 0; i < rows.length; i++) {
//         const row = rows[i]

//         if(!row.clean_name)continue        
//         if(!row.parsed_address_street_name)continue        
//         if(!(row.clean_name in matches))continue

//         const ids = matches[row.clean_name]

//         for (let j = 0; j < ids.length; j++) {
//             const target_i = ids[j]
//             // ignore previous or current rows
//             if(target_i <= i)continue
//             const target_row = rows[target_i]

//             // compute levenshtein
//             const distance = Levenshtein.get(target_row.parsed_address_street_name!, row.parsed_address_street_name!)
//             if(distance <= threshold_levenshtein)continue

//             // merge
//             const old_id = row.assigned_id!
//             const new_id = target_row.assigned_id!
//             if (old_id === new_id) continue
    
//             if (assigned_ids[new_id].length > 1 && assigned_ids[old_id].length > 1)continue
    
//             for (const i of assigned_ids[old_id]) {
//                 rows[i].assigned_id = new_id
//             }
//             assigned_ids[new_id].push(...assigned_ids[old_id])
    
//             delete assigned_ids[old_id]
//         }
//     }
// }
// console.timeEnd("clean_name")

// console.time("~fields")
// {
//     // score threshold
//     const threshold_levenshtein = 2
//     const threshold_pass = 4
//     const weights = {
//         // parsed_address_street_name: 0,
//         // parsed_address_street_number: 0,
//         // parsed_address_unit: 0,
//         // parsed_address_postal_code: 0,
//         // parsed_address_city: 0,
//         // parsed_address_state: 2,
//         // parsed_address_country: 1,
//         clean_name: 10,
//     }
//     const hashes_cache: Record<string, Minhash> = {}
//     const fields: Partial<
//         Record<keyof ExternalPartyRow, LshIndex>
//     > = Object.fromEntries(
//         // don't ask questions !
//         // i hate shitcoding but this is the most efficient way
//         Object.entries(weights)
//             .map(([k]) => [k, new LshIndex()])
//     )
//     const fieldsKeys = Object.keys(fields) as (keyof typeof fields)[]

//     // fill the objects with the data
//     console.log(`Filling the data in fields...`)
//     for (let i = 0; i < rows.length; i++) {
//         const row = rows[i]

//         for (const key of fieldsKeys) {
//             const value = row[key]!
//             // ignore empty fields
//             if(!value)continue
//             const index = fields[key]!

//             let hash: Minhash = hashes_cache[value]
//             if(!hash) {
//                 hash = new Minhash()
//                 for(const v of value.split(" ")){
//                     if(v.length <= 3)continue
//                     hash.update(v)
//                 }
                
//                 hashes_cache[value] = hash
//             }

//             index.insert(
//                 i.toString(),
//                 hash
//             )
//         }
//     }
//     console.info(`Maps are filled ! Now looking at the fields.`)

//     for (let i = 0; i < rows.length; i++) {
//         const row = rows[i]

//         const scores: Record<number, number> = {}
//         for (const key of fieldsKeys) {
//             const value = row[key]!
//             // ignore empty fields
//             if(!value)continue

//             const index = fields[key]!
//             const hash = hashes_cache[value]

//             const _equals = index.query(hash)
//             const equals = _equals.map(m => parseInt(m))

//             for (const target_i of equals) {
//                 // only target rows that are after this one.
//                 if(target_i <= i)continue
//                 const target_row = rows[target_i]
//                 // we don't care, already in the group.
//                 if(target_row.assigned_id === row.assigned_id)continue
                
//                 if(row[key] !== target_row[key])console.log([row[key], target_row[key]])
//                 scores[target_i] ??= 0

//                 // this is linear score, we should probably weight it
//                 // a country is less important than a street name / street number / city / postal code
//                 scores[target_i] += 1
//             }
//         }

//         for (const [i, score] of Object.entries(scores)) {
//             // ignore this score
//             if(score < threshold_levenshtein)continue

//             if (score < threshold_pass) {
//                 // apply levenshtein
//                 // npm i fast-levenshtein
//             }

//             // javascript objects store keys as string
//             // need to parse it
//             // TODO: Potentially migrate to Map ? maybe faster ?
//             const target_row = rows[parseInt(i)]
//             target_row.assigned_id = row.assigned_id
//         }
//     }
// }
// console.timeEnd("~fields")

if (rows.length > 20_000) {
    for(const row of rows) {
        row.external_id = row.assigned_id

        // for(const key in row) {
        //     if (key !== "external_id" && key !== "transaction_reference_id") {
        //         delete row[key]
        //     }
        // }
    }
} else {
    console.log(
        f1Score(
            rows.map(r => +r.external_id!),
            rows.map(r => +r.assigned_id!),
        )
    )
}


console.info(`Saving rows to merged.csv...`)
console.time("save")
const writeStream = formatCSV(mergedCSVPath)
for (const row of rows) {
    writeStream.write(row)
}
console.timeEnd("save")
console.log(`Finished merging rows !`)