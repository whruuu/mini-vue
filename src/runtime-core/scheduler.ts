
// 用队列存储微任务job
const queue:any[] = []
// 防止每加一个job创建一个promise
let isFlushPending = false

// 有一个promise实例就够了
const p = Promise.resolve()
/**
 * nextTick将函数变成微任务
 * @param fn 
 * @returns 
 */
export function nextTick(fn) {
    return fn ? p.then(fn) : Promise.resolve()
}

/**
 * 将函数加入微任务队列，变成微任务
 * @param job 
 */
export function queueJobs (job) {
    if(!queue.includes(job)){
        queue.push(job)
    }
    // 在执行微任务的时候执行job（同步任务执行完的时候）
    queueFlush()
}

// Promise.resolve().then()的回调函数是微任务
function queueFlush() {
    if(isFlushPending) return;
    isFlushPending = true
    nextTick(flushJobs)
}

function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        job && job();
    }
}


