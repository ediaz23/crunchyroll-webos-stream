

/**
 * @param {Object} obj
 * @param {Number} obj.width
 * @param {Number} obj.height
 * @param {Object} obj.content
 * @returns {{source: String, size: {width: Number, height: Number}}
 */
const getImagePerResolution = ({ width, height, content }) => {
    let out
    if (content) {
        /** @type {Array<{width: Number, height: Number, source: String}>} */
        let images = []
        if (content.images.poster_wide) {
            images = content.images.poster_wide
        } else if (content.images.poster_tall) {
            images = content.images.poster_tall
        } else if (content.images.thumbnail) {
            images = content.images.thumbnail
        } else {
            throw new Error('Image not handle')
        }
        images = Array.isArray(images[0]) ? images[0] : images
        let newImage = images[0]
        let filterFunction
        if (width !== undefined && height !== undefined) {
            filterFunction = imageItem => imageItem.width >= width || imageItem.height >= height
        } else if (width !== undefined) {
            filterFunction = imageItem => imageItem.width >= width
        } else {
            filterFunction = imageItem => imageItem.height >= height
        }
        for (const imageItem of images) {
            if (filterFunction(imageItem)) {
                break
            }
            newImage = imageItem
        }
        out = {
            source: newImage.source,
            size: {
                height: `${height ? Math.min(height, newImage.height) : newImage.height}px`,
                width: `${width ? Math.min(width, newImage.width) : newImage.width}px`,
            }
        }
    } else {
        out = { source: null, size: {} }
    }
    return out
}

const useGetImagePerResolution = () => getImagePerResolution

export default useGetImagePerResolution
