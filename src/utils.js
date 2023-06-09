
export const isTv = () => window.PalmServiceBridge || window.PalmServiceBridge

export const stringifySorted = (obj) => {
    const orderedObj = {}
    Object.keys(obj).sort().forEach(key => {
        orderedObj[key] = obj[key]
    })
    return JSON.stringify(orderedObj)
}


export default {
    isTv,
    stringifySorted,
}
