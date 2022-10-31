const blobToFile = (blobObject, instanceFile) => {
    return new File([blobObject], instanceFile.name, { type: instanceFile.type });
}

export default blobToFile
