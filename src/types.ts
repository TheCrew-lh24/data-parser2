export interface ExternalPartyRow {
    id?: string

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
    phone_indicator?: string,
    parsed_titles?: string,
    abbreviated_name?: string,
    clean_name?: string,
    assigned_id?: string
}