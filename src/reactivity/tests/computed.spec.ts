import { computed } from "../computed";
import { reactive } from "../reactive";

describe('computed', () => {
  it('happy path', () => {
    // 使用跟ref很像,用.value
    // 特点:缓存
    const user = reactive({
        age:1
    })

    const age = computed(()=>{
        return user.age;
    })

    expect(age.value).toBe(1)
  });

  it("should compute lazily", () => {
    const value = reactive({
      foo: 1,
    });
    const getter = jest.fn(() => {
      return value.foo;
    });
    const cValue = computed(getter);

    // lazy
    // 没有调用cValue.value就不会执行getter函数
    expect(getter).not.toHaveBeenCalled();

    // 第一次调用cValue.value,执行getter
    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);
    // 再次调用cValue.value时,不再调用getter,直接返回之前计算出的值
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // 改变getter函数里依赖的响应式对象的值时,收集value -> 就是和effect配对,打开dirty
    // 修改的时候不要触发依赖,修改后获取时再触发依赖返回新值
    value.foo = 2;  //set -> trigger ->收集value -> 就是和effect配对
    expect(getter).toHaveBeenCalledTimes(1);
    // 此时再次调用cValue.value时,要重新执行getter函数,返回新值,所以要打开dirty
    expect(cValue.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);
    // 又一次调用cValue.value时,dirty已经为false,不再执行getter
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
})
