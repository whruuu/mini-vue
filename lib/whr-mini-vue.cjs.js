'use strict';

function toDisplayString(value) {
    return String(value);
}

const extend = Object.assign;
const EMPTY_OBJ = {};
const isObject = (val) => {
    return val !== null && typeof val === "object";
};
const isString = (val) => typeof val === "string";
const hasChanged = (val, newValue) => {
    return !Object.is(val, newValue);
};
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
// 转为驼峰命名 add-foo -> addFoo
const camelize = (str) => {
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : "";
    });
};
// 首字母大写 addFoo -> AddFoo
const capitalize = (str) => {
    return str[0].toUpperCase() + str.slice(1);
};
// 事件回调函数的key addFoo -> onAddFoo
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : "";
};

const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
function createVnode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
        key: props && props.key,
        component: null
    };
    if (typeof children === "string") {
        vnode.shapeFlag |= 4 /* ShapeFlags.TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ShapeFlags.ARRAY_CHILDREN */;
    }
    // 判断children为slot  => 组件节点 && chidren object
    if (vnode.shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
        if (isObject(children)) {
            vnode.shapeFlag |= 16 /* ShapeFlags.SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function createTextVnode(text) {
    return createVnode(Text, {}, text);
}
function getShapeFlag(type) {
    return typeof type === "string" ? 1 /* ShapeFlags.ELEMENT */ : 2 /* ShapeFlags.STATEFUL_COMPONENT */;
}

let activeEffect;
let shouldTrack;
// 用ReactiveEffect类收集响应式数据的依赖,用run触发依赖并收集依赖,用stop停止响应依赖
class ReactiveEffect {
    constructor(fn, scheduler) {
        //为什么用数组?
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    // run在一开始和触发依赖的时候执行
    run() {
        if (!this.active) {
            return this._fn();
        }
        shouldTrack = true;
        activeEffect = this;
        //执行this._fn()即触发依赖并会收集依赖
        const res = this._fn();
        //reset,收集完依赖就停止收集依赖
        shouldTrack = false;
        return res;
    }
    stop() {
        //防止用户多次调用stop()函数,频繁清空
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
}
const targetMap = new Map();
/**
 * 收集依赖
 * @param target
 * @param key
 */
function track(target, key) {
    if (!isTracking())
        return;
    // target -> key -> dep
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    trackEffects(dep);
}
function trackEffects(dep) {
    // 优化:dep中已经有的effect不用再收集
    if (dep.has(activeEffect))
        return;
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
}
function isTracking() {
    // 如果单纯获取reactive对象的值,该值不被包裹在effect里的话,activeEffect是undefined,没有deps属性
    // if(!activeEffect) return;
    // 在stop状态不再收集依赖,响应式停止
    // if(!shouldTrack) return;
    return shouldTrack && activeEffect !== undefined;
}
/**
 * 触发依赖
 * @param target
 * @param key
 */
function trigger(target, key) {
    let depsMap = targetMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 将options对象上的属性拷贝给_effect
    // Object.assign(_effect,options)
    extend(_effect, options);
    _effect.run();
    // bind只改变this指向,不调用函数,返回值是个函数
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect;
    return runner;
}

// 这样只在初始化的时候调用一次函数
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key) {
        if (key === "_v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
            return !isReadOnly;
        }
        else if (key === "_v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
            return isReadOnly;
        }
        const res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        // 看看res是不是object
        if (isObject(res)) {
            return isReadOnly ? readonly(res) : reactive(res);
        }
        if (!isReadOnly) {
            //收集依赖
            track(target, key);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        //触发依赖
        trigger(target, key);
        return res;
    };
}
const mutableHandler = {
    get,
    set,
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key, value) {
        console.warn(`key:${key} set失败,因为target是readonly的`, target);
        return true;
    },
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandler);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
function createReactiveObject(target, baseHandlers) {
    if (!isObject(target)) {
        console.warn(`target ${target}必须是一个对象`);
        return target;
    }
    return new Proxy(target, baseHandlers);
}

// object -> proxy -> get set
// 1 true "str" -> {} -> value ->get set
class RefImpl {
    constructor(value) {
        this._v_isRef = true;
        this._rawValue = value;
        this._value = convert(value);
        this.dep = new Set();
    }
    get value() {
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        if (hasChanged(this._rawValue, newValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref._v_isRef;
}
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unRef(Reflect.get(target, key));
        },
        set(target, key, newValue) {
            if (isRef(target[key]) && !isRef(newValue)) {
                return target[key].value = newValue;
            }
            else {
                return Reflect.set(target, key, newValue);
            }
        }
    });
}

// emit("add")
function emit(instance, event, ...args) {
    // console.log('emit',event)
    const { props } = instance;
    // TDD思想：具体->通用
    // add -> Add
    // add-foo -> addFoo -> AddFoo
    const handlerName = toHandlerKey(camelize(event));
    const handler = props[handlerName];
    // 如果有就调用事件的回调函数
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    // 根组件App没有props，所以rawProps可能为undefined，那就给{}
    instance.props = rawProps || {};
}

const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        // 通过setupState获取this.msg
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        // if(key==="$el"){
        // 这里的instance.type = Component，并没有mountElement，vnode就没有el
        // 应该在mountElement结束之后给instance.vnode.el赋值
        // return instance.vnode.el
        // }
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};

function initSlots(instance, children) {
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* ShapeFlags.SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const val = children[key];
        slots[key] = (props) => normalizeSlotValue(val(props));
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        emit: () => { },
        slots: {},
        provides: parent ? parent.provides : {},
        parent,
        isMounted: false,
        subTree: {},
        next: null, //下次要更新的vnode
    };
    // emit.bind(null,component) emit第一个参数写死component占位，用户就只需要传event
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);
    // 初始化一个有状态的component，函数组件是没有状态的
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    const Component = instance.type;
    // {} -> ctx
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
    const { setup } = Component;
    if (setup) {
        // 在调用组件的setup函数之前赋值给currentInstance
        // setup函数调用时，getCurrentInstance()的时候就是当前组件了
        setCurrentInstance(instance);
        // 返回两种结果：function Object
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit
        });
        // 调用完setup函数，清空currentInstance
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    //function
    //Object
    if (typeof setupResult === "object") {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    // 用户如果写了render函数，它的优先级是最高的
    if (compiler && !Component.render) {
        // 判断用户是否提供template
        if (Component.template) {
            Component.render = compiler(Component.template);
        }
    }
    instance.render = Component.render;
}
// 中间变量，获取当前instance
let currentInstance = null;
// 封装为函数的好处：当currentInstance = instance发生错误时，在函数内打断点即可，否则不知道是哪个赋值出错了
function setCurrentInstance(instance) {
    currentInstance = instance;
}
function getCurrentInstance() {
    return currentInstance;
}
// 依赖注入
let compiler;
function registerRuntimeCompiler(_compiler) {
    compiler = _compiler;
}

function createAppAPI(render) {
    // createApp依赖render函数，而render在createRenderer里，所以外面包一层createAppAPI就是为了把render传进去
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 先转换成虚拟节点
                // component -> vnode
                // 所有的逻辑操作都会基于vnode做处理
                const vnode = createVnode(rootComponent);
                render(vnode, rootContainer);
            }
        };
    };
}

function shouldUpdateComponent(prevVnode, nextVnode) {
    const { props: prevProps } = prevVnode;
    const { props: nextProps } = nextVnode;
    for (const key in nextProps) {
        if (nextProps[key] !== prevProps[key])
            return true;
    }
    return false;
}

// 用队列存储微任务job
const queue = [];
// 防止每加一个job创建一个promise
let isFlushPending = false;
// 有一个promise实例就够了
const p = Promise.resolve();
/**
 * nextTick将函数变成微任务
 * @param fn
 * @returns
 */
function nextTick(fn) {
    return fn ? p.then(fn) : Promise.resolve();
}
/**
 * 将函数加入微任务队列，变成微任务
 * @param job
 */
function queueJobs(job) {
    if (!queue.includes(job)) {
        queue.push(job);
    }
    // 在执行微任务的时候执行job（同步任务执行完的时候）
    queueFlush();
}
// Promise.resolve().then()的回调函数是微任务
function queueFlush() {
    if (isFlushPending)
        return;
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}

function createRenderer(options) {
    // 改名字，出了问题能一眼看出是渲染接口的问题
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    // render函数在函数内，无法直接被外部调用，那就让createAppAPI进来，把createApp返回出去，所以要return { createApp:createAppAPI(render) }
    function render(vnode, container) {
        // patch
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        const { type, shapeFlag } = n2;
        // Fragment -> 只渲染children
        switch (type) {
            // 对特殊类型进行特殊处理
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & 1 /* ShapeFlags.ELEMENT */) {
                    // 处理元素
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* ShapeFlags.STATEFUL_COMPONENT */) {
                    // 处理组件
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        const { children } = n2;
        const textNode = n2.el = document.createTextNode(children);
        container.append(textNode);
    }
    /**
     * 处理元素
     * @param n1
     * @param n2
     * @param container
     * @param parentComponent
     * @param anchor
     */
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            //初始化时，创建元素，el挂在n1
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            // 更新时，n2.el = n1.el
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("patchElement");
        console.log("n1", n1);
        console.log("n2", n2);
        // 更新对比props
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;
        //下次再调用patchElement时，现在的n2就变成n1了，要保证下次n1有el
        const el = n2.el = n1.el;
        patchProps(el, oldProps, newProps);
        // 更新对比children
        patchChildren(n1, n2, el, parentComponent, anchor);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        const prevShapeFlag = n1.shapeFlag;
        const { shapeFlag } = n2;
        // 新的是文本
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
                // 老的是数组
                // 1.把老的children清空
                unmountChildren(n1.children);
            }
            // 2.设置text
            if (n1.children !== n2.children) {
                hostSetElementText(container, n2.children);
            }
        }
        else {
            // 新的是数组
            if (prevShapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
                // 老的是文本
                hostSetElementText(container, '');
                mountChildren(n2.children, container, parentComponent, anchor);
            }
            else {
                // 老的也是数组，情况复杂，考虑性能（双端算法）
                patchKeyedChildren(n1.children, n2.children, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, anchor) {
        let i = 0;
        let e1 = c1.length - 1;
        let e2 = c2.length - 1;
        const l2 = c2.length;
        function isSameVnodeType(n1, n2) {
            return n1.type === n2.type && n1.key === n2.key;
        }
        //1、 左侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVnodeType(n1, n2)) {
                // 如果相同，更新节点
                patch(n1, n2, container, parentComponent, anchor);
            }
            else {
                break;
            }
            i++;
        }
        //2、 右侧对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVnodeType(n1, n2)) {
                // 如果相同，更新节点
                patch(n1, n2, container, parentComponent, anchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        if (i > e1) {
            //3、 新的比老的长，创建
            if (i <= e2) {
                // 右侧对比，e2+1<l2；anchor为c2[nextPos].el，该元素是固定的，在它之前添加
                // 左侧对比，e2+1>=l2，anchor为null，直接往后添加
                const nextPos = e2 + 1;
                const anchor = nextPos < l2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    // 创建新节点    比老的多几个呢，不用循环吗
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            //4、 老的比新的长，删除
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 5、中间对比：乱序的部分
            // 5.1 删除老的（d） （在老的里面存在，新的里面不存在）
            // a b (c d) f g
            // a b (e c) f g
            // 5.2 移动 （e）（e在老的新的里面都存在，但位置变了）
            // a b (c d e) f g
            // a b (e c d) f g
            // 5.3 创建新的（d） （在老的里面不存在，新的里面存在）
            // a b (c e) f g
            // a b (e c d) f g
            let s1 = i; //记录遍历的起始位置
            let s2 = i;
            const toBePatched = e2 - s2 + 1; //新节点要更新的总个数
            let patched = 0; //记录新节点被更新的个数
            const keyToNewIndexMap = new Map();
            const newIndexToOldIndexMap = new Array(toBePatched); //定长数组性能好，长度为新节点要更新的总个数
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 初始化newIndexToOldIndexMap映射表为0，i从0开始！
            for (let i = 0; i < toBePatched; i++) {
                //0代表没有建立成映射关系,新的节点在老的节点中不存在
                newIndexToOldIndexMap[i] = 0;
            }
            // 1.遍历新孩子，建立key和newIndex的映射表
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 2.遍历老孩子，新孩子也有的节点就patch更新，没有就删除
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                // 老的比新的多，那么多出来的直接就可以被干掉
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                // 找到老节点在新节点数组的位置
                let newIndex;
                if (prevChild.key != null) {
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 没有key就循环挨个比，直到找到一样的节点
                    for (let j = s2; j <= e2; j++) {
                        if (isSameVnodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    // 在新的里找不到就删除
                    hostRemove(prevChild.el);
                }
                else {
                    // 移动优化。判断(c d e)需不需要移动，如果不需要移动，直接让increasingNewIndexSequence为[]
                    // 如果不需要移动，newIndex(c)<newIndex(d)<newIndex(e)
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    //建立映射,newIndexToOldIndexMap存的是新节点在老节点中的位置+1！ i可能为0，有特殊含义，所以 +1
                    //这样数组中最长递增子序列就是没有调整顺序的部分
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 找到就调用patch 递归对比 更新节点
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    patched++;
                }
            }
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = increasingNewIndexSequence.length - 1; //j是最长递增子序列的指针
            // 倒序遍历新孩子乱序部分序号，同时倒序遍历最长递增子序列，比较index的值，相同就往前移动指针，不同就移动元素位置
            for (let i = toBePatched - 1; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex]; //移动的nextChild，因为patch更新过，有el；但新增的nextChild没有el
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    // 创建
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    // 移动
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动位置。调用insert方法。将新孩子乱序部分从锚点f前开始插入，锚点依次向前移动
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j--;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        children.forEach(child => {
            const el = child.el;
            // remove
            hostRemove(el);
        });
    }
    function patchProps(el, oldProps, newProps) {
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextprop = newProps[key];
                if (prevProp !== nextprop) {
                    hostPatchProp(el, key, prevProp, nextprop);
                }
            }
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    const prevProp = oldProps[key];
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, prevProp, null);
                    }
                }
            }
        }
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        const { type, props, children, shapeFlag } = vnode;
        // 创建真实节点
        const el = vnode.el = hostCreateElement(type);
        // children
        if (shapeFlag & 4 /* ShapeFlags.TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ShapeFlags.ARRAY_CHILDREN */) {
            mountChildren(vnode.children, el, parentComponent, anchor);
        }
        // props
        for (const key in props) {
            const val = props[key];
            hostPatchProp(el, key, null, val);
        }
        // container.append(el)
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach(vnode => {
            patch(null, vnode, container, parentComponent, anchor);
        });
    }
    /**
     * 处理组件
     * @param n1
     * @param n2
     * @param container
     * @param parentComponent
     * @param anchor
     */
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            updateComponent(n1, n2);
        }
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建组件实例的时候就把componentInstance挂在vnode上
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
        setupComponent(instance);
        setupRenderEffect(instance, container, anchor);
    }
    //更新组件就是调用当前这个组件的render函数，重新生成新的虚拟节点，再进行patch对比更新
    function updateComponent(n1, n2) {
        const instance = n2.component = n1.component;
        if (shouldUpdateComponent(n1, n2)) {
            instance.next = n2;
            // 更新组件就是要重新执行该组件的render函数，所以要再次调用effect()包裹的函数
            instance.update(); //再次update，重置n2的component和n2.el，为之后操作做准备
        }
        else {
            //不用更新组件，但也要重置部分内容
            n2.el = n1.el;
            instance.vnode = n2;
        }
    }
    /**
     * setup结果响应式渲染
     * @param instance
     * @param container
     * @param anchor
     */
    function setupRenderEffect(instance, container, anchor) {
        // 包裹effect进行响应式数据的依赖收集，调用render函数的时候，生成虚拟节点树，里面的响应式数据触发依赖收集
        // 拿到effect()执行返回的runner放到组件实例上，可随时执行依赖函数
        instance.update = effect(() => {
            if (!instance.isMounted) {
                console.log("init");
                const { proxy } = instance;
                // subTree是虚拟节点树
                // render函数内的this指向代理对象
                // 为什么传第二个proxy后，this就指向_ctx？？？？？？
                const subTree = instance.subTree = instance.render.call(proxy, proxy);
                // vnode -> patch
                // vnode -> element -> mountElement
                // instance是subTree的父组件
                patch(null, subTree, container, instance, anchor);
                // 这里所有元素节点patch、mountElement结束，可以获取到根元素的el，把它赋值给组件类型vnode的el
                instance.vnode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
                console.log("update");
                // 更新掉组件的props => 需要一个更新完之后的vnode
                // vnode是之前的虚拟节点，next是新的虚拟节点
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                const subTree = instance.render.call(proxy, proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        }, {
            // sheduler只会在更新响应式数据的时候触发
            scheduler() {
                console.log("update-------scheduler");
                // count.value = 99 时，再执行异步任务
                // 把更新视图的逻辑放进微任务队列，异步只执行一次instance.update
                queueJobs(instance.update);
            }
        });
    }
    return {
        createApp: createAppAPI(render)
    };
}
//重置component，更新数据
function updateComponentPreRender(instance, nextVnode) {
    instance.vnode = nextVnode;
    instance.next = null;
    instance.props = nextVnode.props;
}
/**
 * 获得最长递增子序列
 * a b (c d e) f g
 * a b (e c d) f g
 * 最长递增子序列是 1,2
 * @param arr
 * @returns 最长递增子序列在新孩子乱序部分中的新下标
 */
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function h(type, props, children) {
    return createVnode(type, props, children);
}

function renderSlots(slots, name, props) {
    const slot = slots[name];
    if (slot) {
        if (typeof slot === "function") {
            // children里不可以有数组，所以用Fragment包裹，不多一层也可实现
            return createVnode(Fragment, {}, slot(props));
        }
    }
}

function provide(key, value) {
    // 存
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        // 当前组件没有用到provide时，provide就默认指向父级的provide
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
        if (provides === parentProvides) {
            //init 当前组件第一次调用provide ，provides的原型指向父级provides
            provides = currentInstance.provides = Object.create(parentProvides); //parentProvides是provides的原型
        }
        // 当前组件再次调用provide时，只给provides添加属性
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    const isOn = key => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        // 给元素注册自定义事件
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        // 给元素添加属性、修改属性、删除属性
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
/**
 *
 * @param child 子节点
 * @param parent 父节点
 * @param anchor 锚点，添加到哪个元素之前
 */
function insert(child, parent, anchor) {
    // anchor为null时，默认添加到最后
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
// 不再依赖于具体的实现了，而是依赖于稳定的接口，稳定的接口通过参数的方式传入，这种方式就是组合
// 达到后续可以更换不同的渲染平台的目的
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
function createApp(...args) {
    return renderer.createApp(...args);
}

var runtimeDom = /*#__PURE__*/Object.freeze({
    __proto__: null,
    createApp: createApp,
    createElementVNode: createVnode,
    createRenderer: createRenderer,
    createTextVnode: createTextVnode,
    getCurrentInstance: getCurrentInstance,
    h: h,
    inject: inject,
    nextTick: nextTick,
    provide: provide,
    proxyRefs: proxyRefs,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    renderSlots: renderSlots,
    toDisplayString: toDisplayString
});

const TO_DISPLAY_STRING = Symbol('toDisplayString');
const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');
// 做反向映射
const helperMapName = {
    // TO_DISPLAY_STRING是变量，所以要加[]
    [TO_DISPLAY_STRING]: "toDisplayString",
    [CREATE_ELEMENT_VNODE]: "createElementVNode"
};

// 只负责生成代码，不负责对ast做处理
function generate(ast) {
    const context = createCodegenContext();
    const { push } = context;
    // 导入函数
    genFunctionPreamble(ast, context);
    // render函数
    push("return ");
    const functionName = "render";
    const args = ["_ctx", "_cache"];
    const signature = args.join(", ");
    // 拼接函数名和参数
    push(`function ${functionName}(${signature}){`);
    // 拼接函数返回值
    // 不想关心ast的结构,把获取codegenNode的逻辑放在transform,ast.codegenNode = ast.children[0]
    push(`return `);
    genNode(ast.codegenNode, context);
    push("}");
    return {
        code: context.code
    };
}
function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source;
        },
        helper(key) {
            return `_${helperMapName[key]}`;
        }
    };
    return context;
}
function genFunctionPreamble(ast, context) {
    const { push } = context;
    const VueBinding = "Vue";
    const aliasHelper = (s) => {
        return `${helperMapName[s]} : _${helperMapName[s]}`;
    };
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(",")} } = ${VueBinding}`);
    }
    push("\n");
}
function genNode(node, context) {
    switch (node.type) {
        case 3 /* NodeTypes.TEXT */:
            genText(context, node);
            break;
        case 0 /* NodeTypes.INTERPOLATION */:
            genInterpolation(node, context);
            break;
        case 1 /* NodeTypes.SIMPLE_EXPRESSION */:
            genExpression(node, context);
            break;
        case 2 /* NodeTypes.ELEMENT */:
            genElement(node, context);
            break;
        case 5 /* NodeTypes.COMPOUND_EXPRESSION */:
            genCompoundExpression(node, context);
            break;
    }
}
// 复合类型节点
function genCompoundExpression(node, context) {
    const { push } = context;
    const { children } = node;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child);
        }
        else {
            genNode(child, context);
        }
    }
}
function genElement(node, context) {
    const { push, helper } = context;
    const { tag, props, children } = node;
    // 不想知道ast树的结构，把children[0]逻辑提前在transformElement里处理好
    // const child = children[0]
    push(`${helper(CREATE_ELEMENT_VNODE)}(`);
    genNodeList(genNullable([tag, props, children]), context);
    push(")");
}
function genNullable(args) {
    return args.map((arg) => arg || "null");
}
function genNodeList(nodes, context) {
    const { push } = context;
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node);
        }
        else {
            genNode(node, context);
        }
        if (i < nodes.length - 1) {
            push(", ");
        }
    }
}
function genText(context, node) {
    const { push } = context;
    push(`"${node.content}"`);
}
function genInterpolation(node, context) {
    const { push, helper } = context;
    push(`${helper(TO_DISPLAY_STRING)}(`);
    genNode(node.content, context);
    push(")");
}
function genExpression(node, context) {
    const { push } = context;
    push(`${node.content}`);
}

function baseParse(content) {
    const context = createParseContext(content);
    return createRoot(parseChildren(context, []));
}
function createRoot(children) {
    return {
        children,
        type: 4 /* NodeTypes.ROOT */
    };
}
function createParseContext(content) {
    return {
        source: content
    };
}
function parseChildren(context, ancestors) {
    const nodes = [];
    while (!isEnd(context, ancestors)) {
        let node;
        const s = context.source;
        // 判断是不是插值
        if (s.startsWith("{{")) {
            node = parseInterpolation(context);
        }
        else if (s[0] === "<") {
            // 判断是不是元素标签
            if (/[a-z]/i.test(context.source[1])) {
                node = parseElement(context, ancestors);
            }
        }
        // 如果不是插值，也不是element，默认为text
        if (!node) {
            node = parseText(context);
        }
        nodes.push(node);
    }
    return nodes;
}
function isEnd(context, ancestors) {
    const s = context.source;
    if (s.startsWith("</")) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            // 2.当遇到任意结束标签的时候
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    // 1.source有值的时候
    return !s;
}
/**
 * 解析text
 * @param context
 * @returns
 */
function parseText(context) {
    //孩子中可能有text，也有可能有插值语法,也可能为element，提取的text content应该为{{或<之前的内容
    const endTokens = ["{{", "<"];
    let endIndex = context.source.length;
    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i]);
        if (index != -1 && endIndex > index)
            endIndex = index;
    }
    //1.获取content
    const content = parseTextData(context, endIndex);
    console.log("textContent", content);
    return {
        type: 3 /* NodeTypes.TEXT */,
        content: content
    };
}
function parseTextData(context, length) {
    const content = context.source.slice(0, length);
    //2.推进
    advanceBy(context, content.length);
    return content;
}
/**
 * 解析element标签
 * @param context
 * @returns
 */
function parseElement(context, ancestors) {
    // 1.解析tag
    const element = parseTag(context, 0 /* TagType.Start */);
    // 用栈ancestors收集element
    ancestors.push(element);
    element.children = parseChildren(context, ancestors);
    ancestors.pop();
    const s = context.source;
    const tag = element.tag;
    if (startsWithEndTagOpen(s, tag)) {
        parseTag(context, 1 /* TagType.End */);
    }
    else {
        throw new Error(`缺少结束标签:${element.tag}`);
    }
    return element;
}
function startsWithEndTagOpen(s, tag) {
    return s.startsWith("</") && tag.toLowerCase() === s.slice(2, 2 + tag.length).toLowerCase();
}
function parseTag(context, type) {
    const match = /^<\/?([a-z]*)/i.exec(context.source);
    const tag = match[1];
    // 2.删除处理完成的代码
    advanceBy(context, match[0].length + 1);
    if (type === 1 /* TagType.End */)
        return;
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
    };
}
/**
 * 解析插值语法
 * @param context
 * @returns
 */
function parseInterpolation(context) {
    const openDelimiter = "{{";
    const closeDelimiter = "}}";
    // 推进到{{后面
    const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length);
    advanceBy(context, openDelimiter.length);
    // console.log("context.source:",context.source)  //message}}
    // 截取中间的内容并去除空格
    const rawContentLength = closeIndex - openDelimiter.length;
    const rawContent = parseTextData(context, rawContentLength); //context.source.slice(0,rawContentLength)
    const content = rawContent.trim();
    // console.log("content:",content)  //message
    // 推进到}}后面
    advanceBy(context, closeDelimiter.length);
    // console.log("context.source:",context.source)
    return {
        type: 0 /* NodeTypes.INTERPOLATION */,
        content: {
            type: 1 /* NodeTypes.SIMPLE_EXPRESSION */,
            content: content
        }
    };
}
function advanceBy(context, length) {
    context.source = context.source.slice(length);
}

// 程序变动点和稳定点分离开，保证了代码的可测试性
// 程序变动点由外部控制，把想要处理的逻辑通过plugin传入，内部处理完把关键数据比如node返回出来
// 本模块代码是程序稳定点
function transform(root, options = {}) {
    const context = createTransformContext(root, options);
    // 1.遍历 - 深度优先搜索
    // 2.修改 - text的content ->放在plugin
    traverseNode(root, context);
    createRootCodegen(root);
    // 把节点生成code需要的外部函数放在root.helpers上
    root.helpers = [...context.helpers.keys()];
}
function createRootCodegen(root) {
    const child = root.children[0];
    if (child.type === 2 /* NodeTypes.ELEMENT */) { //这个判断条件合适吗
        //codegenNode是transformElement处理过的vnodeElement节点
        root.codegenNode = child.codegenNode;
    }
    else {
        //没被处理过
        root.codegenNode = root.children[0];
    }
}
function createTransformContext(root, options) {
    // 全局上下文对象
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [],
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1);
        }
    };
    return context;
}
function traverseNode(node, context) {
    const nodeTransforms = context.nodeTransforms;
    let exitFns = [];
    // 进入时把插件处理函数存起来
    for (let i = 0; i < nodeTransforms.length; i++) {
        const nodeTransform = nodeTransforms[i];
        const onExit = nodeTransform(node, context);
        if (onExit)
            exitFns.push(onExit);
    }
    switch (node.type) {
        case 0 /* NodeTypes.INTERPOLATION */:
            context.helper(TO_DISPLAY_STRING);
            break;
        case 4 /* NodeTypes.ROOT */:
        case 2 /* NodeTypes.ELEMENT */:
            traverseChildren(node, context);
            break;
    }
    // 退出的时候倒着执行插件处理函数
    let i = exitFns.length;
    while (i--) {
        exitFns[i]();
    }
}
function traverseChildren(node, context) {
    const children = node.children;
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context);
        }
    }
}

function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type: 2 /* NodeTypes.ELEMENT */,
        tag,
        props,
        children
    };
}

// 添加Element的helper的插件
function transformElement(node, context) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        // element处理插件退出的时候才执行，所以要return出去；进入的时候执行transformElement()只会返回函数不会执行
        return () => {
            //中间处理层
            //tag
            const vnodeTag = `"${node.tag}"`;
            //props
            let vnodeProps;
            //children
            const children = node.children;
            let vnodeChildren = children[0]; //vnodeChildren是compound类型节点
            //修改后的元素节点
            node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren);
        };
    }
}

// 处理插值语法里的表达式的插件，node是插值节点。{{message}} -> {{_ctx.message}}
function transformExpression(node) {
    if (node.type === 0 /* NodeTypes.INTERPOLATION */) {
        node.content = processExpression(node.content);
    }
}
// 这里的node是message表达式
function processExpression(node) {
    node.content = "_ctx." + node.content;
    return node;
}

function isText(node) {
    return (node.type === 3 /* NodeTypes.TEXT */ || node.type === 0 /* NodeTypes.INTERPOLATION */);
}

function transformText(node) {
    if (node.type === 2 /* NodeTypes.ELEMENT */) {
        // Text处理插件退出的时候才执行，所以要return出去；进入的时候执行transformText()只会返回函数不会执行
        return () => {
            const { children } = node;
            // 新树新加的一层节点，为复合类型
            let currentContainer;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            // 初始化，孩子节点的第一个节点转为复合节点的父节点
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: 5 /* NodeTypes.COMPOUND_EXPRESSION */,
                                    children: [child]
                                };
                            }
                            currentContainer.children.push(" + "); //字符串类型
                            currentContainer.children.push(next); //对象类型
                            children.splice(j, 1);
                            j--;
                        }
                        else {
                            // 必须是连续的两个text节点才能转为复合节点
                            currentContainer = undefined;
                            break;
                        }
                    }
                }
            }
        };
    }
}

function baseCompile(template) {
    const ast = baseParse(template);
    transform(ast, {
        //注意顺序，先生成COMPOUND节点，再转化元素
        nodeTransforms: [transformExpression, transformElement, transformText]
    });
    return generate(ast);
}

// 整个mini-vue的出口
function compileToFunction(template) {
    const { code } = baseCompile(template);
    const render = new Function("Vue", code)(runtimeDom);
    return render;
}
//通过registerRuntimeCompiler把compileToFunction注入到component，
//将runtime-core和compile-core两个模块解耦
//runtime-core间接引用compile-core的方法
registerRuntimeCompiler(compileToFunction);
// function Function(Vue) {
//     const { 
//         toDisplayString : _toDisplayString,
//         createElementBlock : _createElementBlock 
//     } = Vue
//     return function render(_ctx, _cache, $props, $setup, $data, $options) {
//         return (
//             _openBlock(),
//             _createElementBlock(
//                 "div", 
//                 null, 
//                 "hi," + _toDisplayString(_ctx.message), 
//                 1 /* TEXT */))
//     }
// }

exports.createApp = createApp;
exports.createElementVNode = createVnode;
exports.createRenderer = createRenderer;
exports.createTextVnode = createTextVnode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.nextTick = nextTick;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.ref = ref;
exports.registerRuntimeCompiler = registerRuntimeCompiler;
exports.renderSlots = renderSlots;
exports.toDisplayString = toDisplayString;
