let rImageType = /data:(image\/.+);base64,/;

const base64ToBlob = (data) => {
    let mimeString = "";
    let raw, uInt8Array, i, rawLength;

    raw = data.replace(rImageType, function (header, imageType) {
        mimeString = imageType;
        return "";
    });

    raw = atob(raw);
    rawLength = raw.length;
    uInt8Array = new Uint8Array(rawLength);

    for (i = 0; i < rawLength; i += 1) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: mimeString });
};

export default base64ToBlob
