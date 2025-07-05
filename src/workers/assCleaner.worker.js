/* global self */

self.onmessage = (event) => {
    const assText = event.data

    //    self.postMessage(assText.replace(
    //        /\\(move|fad|t\([^)]+\)|pos|org)([^\w]|$)/gi,
    //        ''
    //    ))
    self.postMessage(assText)
}
