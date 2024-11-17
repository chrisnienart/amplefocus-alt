export function _insertRowToDict(tableDict, newRow) {
    tableDict.unshift(newRow);
    return tableDict;
}

export function _dataURLFromBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            resolve(event.target.result);
        };
        reader.onerror = function(event) {
            reader.abort();
            reject(event.target.error);
        };
        reader.readAsDataURL(blob);
    });
}

export function _insertColumnInMemory(memory, name, data) {
    return memory.map((obj, index) => ({
        [name]: data[index],
        ...obj
    }));
}
