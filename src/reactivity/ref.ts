import { hasChanged, isObject } from './../shared/index';
import { isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from './reactive';

// object -> proxy -> get set
// 1 true "str" -> {} -> value ->get set
class RefImpl{
    private _value: any;
    // 因为只有一个value,所以只要一个dep即可,不用像reactive用targetMap收集depsMap,用depsMap收集dep
    public dep
    private _rawValue: any;
    public _v_isRef = true

    constructor(value){
        this._rawValue = value
        this._value = convert(value)
        this.dep = new Set()
    }

    get value(){
        trackRefValue(this)
        return this._value
    }

    set value(newValue){
        if(hasChanged(this._rawValue,newValue)){
            this._rawValue = newValue
            this._value = convert(newValue)
            triggerEffects(this.dep)
        }
    }
}

function convert(value) {
    return  isObject(value)? reactive(value) : value  
}

function trackRefValue(ref) {
    if(isTracking()){
        trackEffects(ref.dep)
    }
}

export function ref (value) {
    return new RefImpl(value)
}

export function isRef (ref) {
    return !!ref._v_isRef
}

export function unRef (ref) {
    return isRef(ref)? ref.value : ref
}

export function proxyRefs (objectWithRefs) {
    return new Proxy(objectWithRefs,{
        get(target,key){
            return unRef(Reflect.get(target,key))
        },
        set(target,key,newValue){
            if(isRef(target[key])&& !isRef(newValue)){
                return target[key].value = newValue
            }else{
                return Reflect.set(target,key,newValue)
            }
        }
    })
}