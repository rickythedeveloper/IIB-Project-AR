const getData = new Promise(async (resolve, reject) => {
    let indices, vertices, data;
    const indicesResponse = await fetch('../data/indices.bin');
    const indicesBlob = await indicesResponse.blob();
    const indicesReader = new FileReader();
    indicesReader.onload = () => {
        indices = new Uint32Array(indicesReader.result);
        if (indices && vertices && data)
            resolve({ indices, vertices, data });
    };
    indicesReader.onerror = reject;
    indicesReader.readAsArrayBuffer(indicesBlob);
    const verticesResponse = await fetch('../data/vertices.bin');
    const verticesBlob = await verticesResponse.blob();
    const verticesReader = new FileReader();
    verticesReader.onload = () => {
        vertices = new Float32Array(verticesReader.result);
        if (indices && vertices && data)
            resolve({ indices, vertices, data });
    };
    verticesReader.onerror = reject;
    verticesReader.readAsArrayBuffer(verticesBlob);
    const dataResponse = await fetch('https://dl.dropboxusercontent.com/s/0mmd7dczala0ljd/values_sch_all.bin');
    const dataBlob = await dataResponse.blob();
    const dataReader = new FileReader();
    dataReader.onload = () => {
        data = new Float32Array(dataReader.result);
        if (indices && vertices && data)
            resolve({ indices, vertices, data });
    };
    dataReader.onerror = reject;
    dataReader.readAsArrayBuffer(dataBlob);
});
export const getProcessedData = async () => {
    const { indices, vertices, data } = await getData;
    let minX, maxX, minY, maxY;
    vertices.forEach((value, index) => {
        if (index % 2 === 0) {
            if (minX === undefined || minX > value)
                minX = value;
            if (maxX === undefined || maxX < value)
                maxX = value;
        }
        else {
            if (minY === undefined || minY > value)
                minY = value;
            if (maxY === undefined || maxY < value)
                maxY = value;
        }
    });
    if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined)
        throw new Error('min / max values not found');
    const normalisationConstant = Math.max(maxX - minX, maxY - minY);
    const scale = 3;
    const vertices3D = new Float32Array(vertices.length / 2 * 3);
    vertices.forEach((value, index) => {
        if (minX === undefined || maxX === undefined || minY === undefined || maxY === undefined)
            throw new Error('min / max values not found');
        if (index % 2 === 0) {
            vertices3D[index * 3 / 2] = ((value - minX) / normalisationConstant - 0.5) * scale; // x
            vertices3D[index * 3 / 2 + 1] = 0; // y
            vertices3D[index * 3 / 2 + 2] = (vertices[index + 1] - minY) / normalisationConstant * scale; // z
        }
    });
    const minValue = 0, maxValue = 10;
    const colors = new Float32Array(data.length * 3);
    data.forEach((datum, index) => {
        colors[index * 3] = (datum - minValue) / (maxValue - minValue); // red
        colors[index * 3 + 1] = 0.0; // green
        colors[index * 3 + 2] = 0.0; // blue
    });
    return { vertices: vertices3D, indices, colors };
};
//# sourceMappingURL=convenience.js.map