
import { useCallback, useEffect, useState } from 'react'
import { useSetRecoilState } from 'recoil'
import { homeViewReadyState } from '../recoilConfig'
import useMergeContentList from './mergeContentList'


/**
 * @returns {Function}
 */
export const withContentList = (WrappedComponent) => {

    return (props) => {
        /** @type {Function} */
        const setHomeViewReady = useSetRecoilState(homeViewReadyState)
        /** @type {[Array<Object>, Function]} */
        const [contentList, setContentList] = useState([])
        /** @type {[Boolean, Function]}  */
        const [loading, setLoading] = useState(true)
        /** @type {Number} */
        const quantity = 20

        /** @type {Function} */
        const changeContentList = useCallback((newList) => {
            setContentList(newList)
            setLoading(false)
            setHomeViewReady(true)
        }, [setContentList, setHomeViewReady, setLoading])

        /** @type {Function} */
        const mergeContentList = useMergeContentList(setContentList, quantity)

        useEffect(() => {
            return () => {
                setContentList([])
            }
        }, [])

        return <WrappedComponent {...props} {...{
            contentList,
            loading,
            setLoading,
            changeContentList,
            mergeContentList,
            quantity,
        }} />
    }
}

export default withContentList
