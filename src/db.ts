import { AsyncDatabase } from "promised-sqlite3"
import { dbPath } from "./paths.js"

export const db = await AsyncDatabase.open(
    dbPath
)

export interface ExternalPartyRow {
    id?: number,

    transaction_reference_id?: string,
    party_role?: string,
    party_info_unstructured?: string,
    parsed_name?: string,
    parsed_address_street_name?: string,
    parsed_address_street_number?: string,
    parsed_address_unit?: string,
    parsed_address_postal_code?: string,
    parsed_address_city?: string,
    parsed_address_state?: string,
    parsed_address_country?: string,
    party_iban?: string,
    party_phone?: string,
    external_id?: string,

    clean_phone?: string,
    parsed_titles?: string,
    clean_name?: string
}
db.run(`CREATE TABLE IF NOT EXISTS external_parties (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,

    transaction_reference_id     TEXT,
    party_role                   TEXT,
    party_info_unstructured      TEXT,
    parsed_name                  TEXT,
    parsed_address_street_name   TEXT,
    parsed_address_street_number TEXT,
    parsed_address_unit          TEXT,
    parsed_address_postal_code   TEXT,
    parsed_address_city          TEXT,
    parsed_address_state         TEXT,
    parsed_address_country       TEXT,
    party_iban                   TEXT,
    party_phone                  TEXT,
    external_id                  TEXT,

    clean_phone                  TEXT,
    parsed_titles                TEXT,
    clean_name                   TEXT
)`)

export function formatInsertObject(object: Record<string, any>) {
    const fields: string[] = []
    const values: string[] = []
    for (const [field, value] of Object.entries(object)) {
        fields.push(field)
        values.push(value)
    }

    return {
        fields: fields,
        values_escape: values.map(() => "?"),
        values: values
    }
}