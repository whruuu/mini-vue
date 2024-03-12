
import { createVnode } from "./vnode"

export function createAppAPI (render) {
// createApp依赖render函数，而render在createRenderer里，所以外面包一层createAppAPI就是为了把render传进去
    return function createApp (rootComponent) {
        return {
            mount(rootContainer){
                // 先转换成虚拟节点
                // component -> vnode
                // 所有的逻辑操作都会基于vnode做处理
                const vnode = createVnode(rootComponent)

                render(vnode,rootContainer)
            }
        }
    }
}

