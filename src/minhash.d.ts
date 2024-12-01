declare module "minhash" {
    export class Minhash {
        update(s: string): void

    }

    export class LshIndex {
        insert(key: string, hash: Minhash): void

        query(hash: Minhash): string[]
    }
}