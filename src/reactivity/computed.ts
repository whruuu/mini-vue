import { ReactiveEffect } from "./effect"

class ComputedRefImpl{
    private _getter: any
    private _dirty: boolean = true
    private _value: any
    private _effect: ReactiveEffect
    constructor(getter){
        this._getter = getter
        // 用ReactiveEffect类收集响应式数据的依赖,run时触发依赖并收集依赖
        // 执行trigger时,有scheduler就执行scheduler,没有就执行run
        this._effect = new ReactiveEffect(getter,()=>{
            if(!this._dirty){
                this._dirty = true
            }
        })
    }

    get value(){
        // .value调用完一次之后,就锁上,引入变量_dirty
        if(this._dirty){
            this._dirty = false
            // this._value = this._getter()
            this._value = this._effect.run()
        }
        // 再次调用时,不再调用getter,直接返回之前计算出的值
        return this._value
    }
}

export function computed (getter) {
    return new ComputedRefImpl(getter)
}