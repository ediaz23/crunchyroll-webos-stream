import ilib from 'ilib'
import Utils from 'ilib/lib/Utils'
import Country from 'ilib/lib/Country2'


/**
 * Patch Country class, for region419 returing wrong data
 */
export default class extends Country {
    constructor(options) {

        let backOnLoad = null, sync = true, loadParams = undefined
        if (options) {
            if (typeof (options.sync) !== 'undefined') {
                sync = !!options.sync;
            }
            if (options.loadParams) {
                loadParams = options.loadParams;
            }
            backOnLoad = options.onLoad
        }

        options.onLoad = (self) => {
            if (self.hookFlag) {
                if (backOnLoad) {
                    backOnLoad(self)
                }
            } else {
                Utils.loadData({
                    name: 'ctryreverse.json',
                    object: 'Country',
                    locale: self.locale,  // super class this is an error
                    sync: sync,
                    loadParams: loadParams,
                    callback: ilib.bind(self, function(countries) {
                        this.hookFlag = true
                        this.codeToCountry = countries
                        this._calculateCountryToCode()
                        if (backOnLoad) {
                            backOnLoad(this)
                        }
                    })
                })
            }
        }
        super(options)
    }
}

