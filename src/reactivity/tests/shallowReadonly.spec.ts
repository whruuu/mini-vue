import { isReadonly,shallowReadonly } from "../reactive"

describe('shallowReadonly', () => {
  test('should not make non-reactive properties reactive', () => {
    const props = shallowReadonly({n:{foo:1}})
    expect(isReadonly(props)).toBe(true)
    expect(isReadonly(props.n)).toBe(false)
  })

  it('warn when call set',()=>{
    //mock构造一个假的警告方法,最后验证
    console.warn = jest.fn() 

    const user = shallowReadonly({
      age:10
    })
    user.age = 11
    expect(console.warn).toBeCalled()
  })
  
})
