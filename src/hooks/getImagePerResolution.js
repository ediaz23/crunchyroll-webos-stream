

/**
 * @param {Object} obj
 * @param {Number} obj.width
 * @param {Number} obj.height
 * @param {Object} obj.content
 * @returns {{source: String, size: {width: Number, height: Number}}
 */
const getImagePerResolution = ({ width, height, content }) => {
    let out
    if (width && height && content) {
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
        for (const imageItem of images) {
            if (imageItem.width >= width || imageItem.height >= height) {
                break
            }
            newImage = imageItem
        }
        out = {
            source: newImage.source,
            size: {
                height: `${Math.min(height, newImage.height)}px`,
                width: `${Math.min(width, newImage.width)}px`,
            }
        }
    } else {
        out = { source: null, size: {} }
    }
    return out
}

const useGetImagePerResolution = () => getImagePerResolution

export default useGetImagePerResolution
