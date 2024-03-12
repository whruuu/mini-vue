export function initProps (instance,rawProps) {
    // 根组件App没有props，所以rawProps可能为undefined，那就给{}
    instance.props = rawProps || {}
}