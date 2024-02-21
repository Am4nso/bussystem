export const getTopKClasses = async (logits, classes) => {
    const values = await logits.data();
    const topK = Math.min(classes.length, values.length);

    const valuesAndIndices = [];
    for (let i = 0; i < values.length; i++) {
        valuesAndIndices.push({ value: values[i], index: i });
    }

    valuesAndIndices.sort((a, b) => {
        return b.value - a.value;
    });

    const topkValues = new Float32Array(topK);
    const topkIndices = new Int32Array(topK);
    for (let i = 0; i < topK; i++) {
        topkValues[i] = valuesAndIndices[i].value;
        topkIndices[i] = valuesAndIndices[i].index;
    }

    const topClassesAndProbs = [];
    for (let i = 0; i < topkIndices.length; i++) {
        topClassesAndProbs.push({
            class: classes[topkIndices[i]],
            score: topkValues[i]
        });
    }
    return topClassesAndProbs;
}