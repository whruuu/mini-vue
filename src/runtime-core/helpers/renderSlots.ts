import { Fragment } from './../vnode';
import { createVnode } from "../vnode";

export function renderSlots (slots,name,props) {
    const slot = slots[name]
    if(slot) {
        if(typeof slot==="function"){
            // children里不可以有数组，所以用Fragment包裹，不多一层也可实现
            return createVnode(Fragment,{},slot(props))
        }
    }
}