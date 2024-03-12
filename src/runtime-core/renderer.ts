import { Fragment,Text } from './vnode';
import { ShapeFlags } from '../shared/ShapeFlags';
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from './createApp';
import { effect } from '../reactivity/effect';
import { EMPTY_OBJ } from '../shared';
import { shouldUpdateComponent } from './helpers/componentUpdateUtils';
import { queueJobs } from './scheduler';

export function createRenderer (options) {
    // 改名字，出了问题能一眼看出是渲染接口的问题
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove:hostRemove,
        setElementText:hostSetElementText
    } = options

    // render函数在函数内，无法直接被外部调用，那就让createAppAPI进来，把createApp返回出去，所以要return { createApp:createAppAPI(render) }
    function render(vnode,container) {
        // patch
        patch(null,vnode,container,null,null)
    }

    function patch(n1,n2,container,parentComponent,anchor) {
        const {type,shapeFlag} = n2
        // Fragment -> 只渲染children
        switch (type) {
            // 对特殊类型进行特殊处理
            case Fragment:
                processFragment(n1,n2,container,parentComponent,anchor)
                break;
            
            case Text:
                processText(n1,n2,container)
                break;

            default:
                if(shapeFlag & ShapeFlags.ELEMENT){
                    // 处理元素
                    processElement(n1,n2,container,parentComponent,anchor)
                }else if(shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
                    // 处理组件
                    processComponent(n1,n2,container,parentComponent,anchor)
                }
                break;
        }
        
    }

    function processFragment(n1,n2: any, container: any,parentComponent,anchor) {
        mountChildren(n2.children,container,parentComponent,anchor)
    }

    function processText(n1,n2: any, container: any) {
        const {children} = n2
        const textNode = n2.el = document.createTextNode(children)
        container.append(textNode)
    }

    /**
     * 处理元素
     * @param n1 
     * @param n2 
     * @param container 
     * @param parentComponent 
     * @param anchor 
     */

    function processElement(n1,n2: any, container: any,parentComponent,anchor) {
        if(!n1){
            //初始化时，创建元素，el挂在n1
            mountElement(n2,container,parentComponent,anchor)
        }else{
            // 更新时，n2.el = n1.el
            patchElement(n1,n2,container,parentComponent,anchor)
        }
    }

    function patchElement(n1,n2,container,parentComponent,anchor) {
        console.log("patchElement")
        console.log("n1",n1)
        console.log("n2",n2)

        // 更新对比props
        const oldProps = n1.props || EMPTY_OBJ
        const newProps = n2.props || EMPTY_OBJ
        //下次再调用patchElement时，现在的n2就变成n1了，要保证下次n1有el
        const el = n2.el = n1.el    
        patchProps(el,oldProps,newProps)

        // 更新对比children
        patchChildren(n1,n2,el,parentComponent,anchor)

    }

    function patchChildren(n1: any, n2: any,container,parentComponent,anchor) {
        const prevShapeFlag = n1.shapeFlag
        const {shapeFlag} = n2
        // 新的是文本
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){
                // 老的是数组
                // 1.把老的children清空
                unmountChildren(n1.children)   
            }
            // 2.设置text
            if(n1.children!==n2.children){
                hostSetElementText(container,n2.children)
            }
        }else{
            // 新的是数组
            if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN){
                // 老的是文本
                hostSetElementText(container,'')
                mountChildren(n2.children,container,parentComponent,anchor)
            }else{
                // 老的也是数组，情况复杂，考虑性能（双端算法）
                patchKeyedChildren(n1.children,n2.children,container,parentComponent,anchor)
            }
        }

    }
    function patchKeyedChildren(c1,c2,container,parentComponent,anchor) {
        let i = 0
        let e1 = c1.length - 1
        let e2 = c2.length - 1
        const l2 = c2.length

        function isSameVnodeType(n1,n2) {
            return n1.type === n2.type && n1.key === n2.key
        }

        //1、 左侧对比
        while(i<=e1 && i<=e2){
            const n1 = c1[i]
            const n2 = c2[i]
            if(isSameVnodeType(n1,n2)){
                // 如果相同，更新节点
                patch(n1,n2,container,parentComponent,anchor)
            }else{
                break
            }
            i++
        }

        //2、 右侧对比
        while(i<= e1 && i<=e2){
            const n1 = c1[e1]
            const n2 = c2[e2]
            if(isSameVnodeType(n1,n2)){
                // 如果相同，更新节点
                patch(n1,n2,container,parentComponent,anchor)
            }else{
                break
            }
            e1--
            e2--
        }


        if(i>e1){
            //3、 新的比老的长，创建
            if(i<=e2){
                // 右侧对比，e2+1<l2；anchor为c2[nextPos].el，该元素是固定的，在它之前添加
                // 左侧对比，e2+1>=l2，anchor为null，直接往后添加
                const nextPos = e2+1
                const anchor = nextPos < l2 ? c2[nextPos].el :null
                while(i<=e2){
                    // 创建新节点    比老的多几个呢，不用循环吗
                    patch(null,c2[i],container,parentComponent,anchor)
                    i++
                }
            }
        }else if(i>e2){
            //4、 老的比新的长，删除
            while(i<=e1){
                hostRemove(c1[i].el)
                i++
            }
        }else{
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

            let s1 = i  //记录遍历的起始位置
            let s2 = i

            const toBePatched = e2 - s2 + 1 //新节点要更新的总个数
            let patched = 0 //记录新节点被更新的个数
            const keyToNewIndexMap = new Map()
            const newIndexToOldIndexMap = new Array(toBePatched) //定长数组性能好，长度为新节点要更新的总个数
            let moved = false
            let maxNewIndexSoFar = 0

            // 初始化newIndexToOldIndexMap映射表为0，i从0开始！
            for (let i = 0; i < toBePatched; i++) {
                //0代表没有建立成映射关系,新的节点在老的节点中不存在
               newIndexToOldIndexMap[i]=0  
            }


            // 1.遍历新孩子，建立key和newIndex的映射表
            for (let i = s2; i <= e2 ; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key,i)
            }

            // 2.遍历老孩子，新孩子也有的节点就patch更新，没有就删除
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];

                // 老的比新的多，那么多出来的直接就可以被干掉
                if(patched>=toBePatched){
                    hostRemove(prevChild.el)
                    continue
                }

                // 找到老节点在新节点数组的位置
                let newIndex;
                if(prevChild.key!=null){
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                }else{
                    // 没有key就循环挨个比，直到找到一样的节点
                    for (let j = s2; j <= e2; j++) {
                        if(isSameVnodeType(prevChild,c2[j])){
                            newIndex = j
                            break
                        }
                    }
                }

                if(newIndex === undefined){
                    // 在新的里找不到就删除
                    hostRemove(prevChild.el)
                }else{
                    // 移动优化。判断(c d e)需不需要移动，如果不需要移动，直接让increasingNewIndexSequence为[]
                    // 如果不需要移动，newIndex(c)<newIndex(d)<newIndex(e)
                    if(newIndex>=maxNewIndexSoFar){
                        maxNewIndexSoFar = newIndex
                    }else{
                        moved = true
                    }

                    //建立映射,newIndexToOldIndexMap存的是新节点在老节点中的位置+1！ i可能为0，有特殊含义，所以 +1
                    //这样数组中最长递增子序列就是没有调整顺序的部分
                    newIndexToOldIndexMap[newIndex-s2] = i + 1

                    // 找到就调用patch 递归对比 更新节点
                    patch(prevChild,c2[newIndex],container,parentComponent,null)
                    patched++
                }

            }

            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []
            
            let j = increasingNewIndexSequence.length - 1   //j是最长递增子序列的指针

            // 倒序遍历新孩子乱序部分序号，同时倒序遍历最长递增子序列，比较index的值，相同就往前移动指针，不同就移动元素位置
            for (let i = toBePatched-1; i >= 0; i--) {
                const nextIndex = i+s2
                const nextChild = c2[nextIndex]  //移动的nextChild，因为patch更新过，有el；但新增的nextChild没有el
                const anchor = nextIndex + 1 < l2 ? c2[nextIndex+1].el :null
                if(newIndexToOldIndexMap[i]===0){
                    // 创建
                    patch(null,nextChild,container,parentComponent,anchor)
                }else if(moved){
                    // 移动
                    if( j<0 || i!==increasingNewIndexSequence[j]){
                        // 移动位置。调用insert方法。将新孩子乱序部分从锚点f前开始插入，锚点依次向前移动
                        hostInsert(nextChild.el,container,anchor)
                    }else{
                        j--
                    }
                }
            }

        }


    }

    function unmountChildren(children) {
        children.forEach(child => {
            const el = child.el
            // remove
            hostRemove(el)
        });
    }

    function patchProps(el,oldProps,newProps) {
        if(oldProps!==newProps){
            for (const key in newProps) {
                const prevProp = oldProps[key]
                const nextprop = newProps[key]

                if(prevProp!==nextprop){
                    hostPatchProp(el,key,prevProp,nextprop)
                }
            }

            if(oldProps !== EMPTY_OBJ){
                for (const key in oldProps) {
                    const prevProp = oldProps[key]

                    if(!(key in newProps)){
                        hostPatchProp(el,key,prevProp,null)
                    }
                }
            }
            
        }
    }

    function mountElement(vnode: any, container: any,parentComponent,anchor) {
        const {type,props,children,shapeFlag} = vnode
        // 创建真实节点
        const el = vnode.el = hostCreateElement(type)

        // children
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
            el.textContent = children
        }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
            mountChildren(vnode.children,el,parentComponent,anchor)
        }
        // props
        for (const key in props) {
            const val = props[key]
            hostPatchProp(el,key,null,val)
        }
        // container.append(el)
        hostInsert(el,container,anchor)
    }

    function mountChildren(children: any, container: any,parentComponent,anchor) {
        children.forEach(vnode=>{
            patch(null,vnode,container,parentComponent,anchor)
        })
    }




    /**
     * 处理组件
     * @param n1 
     * @param n2 
     * @param container 
     * @param parentComponent 
     * @param anchor 
     */
    function processComponent(n1,n2: any, container: any,parentComponent,anchor) {
        if(!n1){
            mountComponent(n2,container,parentComponent,anchor)
        }else{
            updateComponent(n1,n2)
        }
    }

    function mountComponent(initialVNode: any,container,parentComponent,anchor) {
        // 创建组件实例的时候就把componentInstance挂在vnode上
        const instance = initialVNode.component = createComponentInstance(initialVNode,parentComponent)
        setupComponent(instance)
        setupRenderEffect(instance,container,anchor)
    }

    //更新组件就是调用当前这个组件的render函数，重新生成新的虚拟节点，再进行patch对比更新
    function updateComponent(n1,n2) {
        const instance = n2.component = n1.component
        if(shouldUpdateComponent(n1,n2)){
            instance.next = n2
            // 更新组件就是要重新执行该组件的render函数，所以要再次调用effect()包裹的函数
            instance.update()   //再次update，重置n2的component和n2.el，为之后操作做准备
        }else{
            //不用更新组件，但也要重置部分内容
            n2.el = n1.el
            instance.vnode = n2
        }
    }

    /**
     * setup结果响应式渲染
     * @param instance 
     * @param container 
     * @param anchor 
     */
    function setupRenderEffect(instance: any,container,anchor) {
        // 包裹effect进行响应式数据的依赖收集，调用render函数的时候，生成虚拟节点树，里面的响应式数据触发依赖收集
        // 拿到effect()执行返回的runner放到组件实例上，可随时执行依赖函数
        instance.update = effect(()=>{
            if(!instance.isMounted){
                console.log("init")
                const {proxy} = instance
                // subTree是虚拟节点树
                // render函数内的this指向代理对象
                // 为什么传第二个proxy后，this就指向_ctx？？？？？？
                const subTree = instance.subTree = instance.render.call(proxy,proxy)
                // vnode -> patch
                // vnode -> element -> mountElement
                // instance是subTree的父组件
                patch(null,subTree,container,instance,anchor)

                // 这里所有元素节点patch、mountElement结束，可以获取到根元素的el，把它赋值给组件类型vnode的el
                instance.vnode.el = subTree.el

                instance.isMounted = true
            }else{
                console.log("update")
                // 更新掉组件的props => 需要一个更新完之后的vnode
                // vnode是之前的虚拟节点，next是新的虚拟节点
                const {next,vnode} = instance
                if(next){
                    next.el = vnode.el
                    updateComponentPreRender(instance,next)
                }
                const {proxy} = instance
                const subTree = instance.render.call(proxy,proxy)
                const prevSubTree = instance.subTree
                instance.subTree = subTree
                patch(prevSubTree,subTree,container,instance,anchor)
            }
        },{
            // sheduler只会在更新响应式数据的时候触发
            scheduler(){
                console.log("update-------scheduler")
                // count.value = 99 时，再执行异步任务
                // 把更新视图的逻辑放进微任务队列，异步只执行一次instance.update
                queueJobs(instance.update)
            }
        })
    }

    return {
        createApp:createAppAPI(render)
    }
}

//重置component，更新数据
function updateComponentPreRender(instance,nextVnode) {
    instance.vnode = nextVnode
    instance.next = null
    instance.props = nextVnode.props
}


/**
 * 获得最长递增子序列
 * a b (c d e) f g
 * a b (e c d) f g
 * 最长递增子序列是 1,2
 * @param arr 
 * @returns 最长递增子序列在新孩子乱序部分中的新下标
 */
function getSequence(arr: number[]): number[] {
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
        } else {
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











