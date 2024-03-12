import { reactive } from "../reactive";
import { effect,stop } from "../effect";
describe('effect', () => {
  it('happy path', () => {
    const user = reactive({
        age:10
    })

    let nextAge;
    effect(() => {
      nextAge = user.age +1
    })

    expect(nextAge).toBe(11)

    //update
    user.age++
    expect(nextAge).toBe(12)
  })

  it('should return runner when call effect', () => {
    // 1. effect(fn) -> function(runner) -> fn -> return
    let foo = 10
    const runner = effect(()=>{
      foo++
      return "foo"
    })
    expect(foo).toBe(11)
    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe("foo")
  })

  it("scheduler", () => {
    // 1.通过effect的第二个参数给定的一个scheduler的fn
    // 2.effect第一次执行的时候,调用第一个参数fn,而不调用scheduler
    // 3.响应式数据变化时,调用scheduler,而不调用第一个参数fn
    // 4.执行runner的时候,会再次执行第一个参数fn

    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  it("stop", () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    // effect()先收集依赖,后触发依赖
    const runner = effect(() => {
      // 收集依赖
      dummy = obj.prop;
    });
    // 先触发依赖,再收集依赖
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    // obj.prop = 3;
    // obj.prop = obj.prop+1  => 先get,再set
    obj.prop++
    expect(dummy).toBe(2);

    // 执行run->执行fn->收集依赖没收集上
    runner();
    expect(dummy).toBe(3);
  });

  it("events: onStop", () => {
    const obj = reactive({
      foo:1
    })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      ()=>{
        dummy=obj.foo
      },
      {
        onStop
      }
    );

    stop(runner)
    expect(onStop).toBeCalledTimes(1)
  });

})
