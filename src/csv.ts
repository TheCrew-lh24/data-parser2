import * as csv from "fast-csv"
import { createReadStream, createWriteStream } from "fs"

export function parseCSV(filename: string) {
    const stream = csv.parse({
        delimiter: ",",
        headers: true
    })

    // start piping into the parser
    createReadStream(filename).pipe(stream)

    let collected: any[] = []
    stream.on("data", row => {
        collected.push(row)
    })

    return async function() {
        if(!collected.length){
            await new Promise<void>(res => {
                if(stream.closed)return res()

                const resolver = () => {
                    res()
                    stream.off("data", resolver)
                    stream.off("close", resolver)
                }
                stream.on("data", resolver)
                stream.on("close", resolver)
            })
        }

        const _collect = collected
        collected = []

        return _collect
    }
}

export function formatCSV(filename: string) {
    const stream = csv.format({
        headers: true,
    })

    stream.pipe(createWriteStream(filename))

    return stream
}