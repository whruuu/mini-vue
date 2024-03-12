import { extend } from "../shared";

let activeEffect;
let shouldTrack;

// 用ReactiveEffect类收集响应式数据的依赖,用run触发依赖并收集依赖,用stop停止响应依赖
export class ReactiveEffect{
    
    private _fn: any;
    //为什么用数组?
    deps = [];
    active = true
    onStop?:()=>void
    public scheduler:Function | undefined
    constructor(fn, scheduler?:Function) {
        this._fn = fn
        this.scheduler = scheduler
    }

    // run在一开始和触发依赖的时候执行
    run() {
        if(!this.active){
            return this._fn()
        }
        shouldTrack = true
        activeEffect = this
        //执行this._fn()即触发依赖并会收集依赖
        const res = this._fn()
        //reset,收集完依赖就停止收集依赖
        shouldTrack = false
        return res
    }

    stop(){
        //防止用户多次调用stop()函数,频繁清空
        if(this.active){
            cleanupEffect(this)
            if(this.onStop){
                this.onStop()
            }
            this.active = false
        }
    }
}

function cleanupEffect(effect) {
    effect.deps.forEach((dep:any)=>{
        dep.delete(effect)
    });
}

const targetMap = new Map()
/**
 * 收集依赖
 * @param target 
 * @param key 
 */
export function track (target,key) {
    if(!isTracking()) return

    // target -> key -> dep
    let depsMap = targetMap.get(target)
    if(!depsMap){
        depsMap = new Map()
        targetMap.set(target,depsMap)
    }
    let dep = depsMap.get(key)
    if(!dep){
        dep = new Set()
        depsMap.set(key,dep)
    }
    trackEffects(dep)
}

export function trackEffects (dep) {
    // 优化:dep中已经有的effect不用再收集
    if(dep.has(activeEffect)) return;
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
}

export function isTracking() {
    // 如果单纯获取reactive对象的值,该值不被包裹在effect里的话,activeEffect是undefined,没有deps属性
    // if(!activeEffect) return;
    // 在stop状态不再收集依赖,响应式停止
    // if(!shouldTrack) return;
    return shouldTrack && activeEffect!==undefined
}
/**
 * 触发依赖
 * @param target 
 * @param key 
 */
export function trigger (target,key) {
    let depsMap = targetMap.get(target)
    let dep = depsMap.get(key)
    triggerEffects(dep)
}

export function triggerEffects (dep) {
    for (const effect of dep) {
        if(effect.scheduler){
            effect.scheduler()
        }else{
            effect.run()
        }
    }
}


export function effect (fn,options:any={}) {
    const _effect = new ReactiveEffect(fn,options.scheduler);
    // 将options对象上的属性拷贝给_effect
    // Object.assign(_effect,options)
    extend(_effect,options)
    _effect.run();
    // bind只改变this指向,不调用函数,返回值是个函数
    const runner:any = _effect.run.bind(_effect)
    runner.effect = _effect
    return runner
}

export function stop (runner) {
    runner.effect.stop()
}