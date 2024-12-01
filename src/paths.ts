import { dirname, join } from "path";
import { fileURLToPath } from "url";

export const __dirname = dirname(
    fileURLToPath(import.meta.url)
)
export const dataPath = join(__dirname, "../data")

export const dbPath = join(
    dataPath,
    "db.sqlite"
)

export const cleanCSVPath = join(
    dataPath,
    "clean.csv"
)
export const mergedCSVPath = join(
    dataPath,
    "merged.csv"
)

export const externalPartiesTrainPath = join(
    dataPath,
    "external_parties_train.csv"
)
export const externalPartiesTestPath = join(
    dataPath,
    "external_parties_test.csv"
)