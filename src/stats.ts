export function indicesOfValue(array: number[], value: number) {
    const indices = array.reduce((acc, curr, index) => {
        if (curr === value) acc.push(index);
        return acc;
    }, [] as number[]);
    const startIndex = indices[0];
    const endIndex = indices[indices.length - 1] + 1;
    return [startIndex, endIndex];
}

export function matchWithBase(trueIds: number[], assignedIds: number[]) {
    const sortedPairs = trueIds
        .map((trueId, index) => [trueId, assignedIds[index]])
        .sort((a, b) => a[0] - b[0]);

    const sortedTrueIds = sortedPairs.map(pair => pair[0]);
    const assignedIdsSortedPair = sortedPairs.map(pair => pair[1]);

    let numAllTotalPairs = 0;
    let numAllMatchedPairs = 0;

    const uniqueTrueIds = [...new Set(sortedTrueIds)];

    uniqueTrueIds.forEach(trueId => {
        const [startIndex, endIndex] = indicesOfValue(sortedTrueIds, trueId);
        const numTrueOccurrences = endIndex - startIndex;
        const numTotalPairs = Math.floor(numTrueOccurrences * (numTrueOccurrences - 1) / 2);
        let numMatchedPairs = 0;

        const slicedAssignedIds = assignedIdsSortedPair.slice(startIndex, endIndex);
        const uniqueAssignedIds = [...new Set(slicedAssignedIds)];

        uniqueAssignedIds.forEach(assignedId => {
            const numAssignedOccurrences = slicedAssignedIds.filter(id => id === assignedId).length;
            numMatchedPairs += Math.floor(numAssignedOccurrences * (numAssignedOccurrences - 1) / 2);
        });

        numAllTotalPairs += numTotalPairs;
        numAllMatchedPairs += numMatchedPairs;
    });

    return numAllTotalPairs > 0 ? numAllMatchedPairs / numAllTotalPairs : 0;
}

export function f1Score(trueIds: number[], assignedIds: number[]) {
    const rc = matchWithBase(trueIds, assignedIds);
    const pr = matchWithBase(assignedIds, trueIds);
    const f1 = rc + pr > 0 ? (2 * rc * pr) / (rc + pr) : 0;
    return [f1, rc, pr];
}