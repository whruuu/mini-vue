import { NodeTypes } from "./ast"

const enum TagType {
    Start,
    End
}


export function baseParse (content:string) {
    const context = createParseContext(content)
    return createRoot(parseChildren(context,[]))
}

function createRoot(children) {
    return {
        children,
        type:NodeTypes.ROOT
    }
}

function createParseContext(content: string) {
    return {
        source:content
    }
}

function parseChildren(context,ancestors) {
    const nodes:any = []

    while(!isEnd(context,ancestors)){
        let node;
        const s = context.source
        // 判断是不是插值
        if(s.startsWith("{{")){
            node = parseInterpolation(context)
        }else if(s[0]==="<"){
            // 判断是不是元素标签
            if(/[a-z]/i.test(context.source[1])){
                node = parseElement(context,ancestors)
            }
        }
        // 如果不是插值，也不是element，默认为text
        if(!node){
            node = parseText(context)
        }
        nodes.push(node)
    }
    
    return nodes
}

function isEnd(context,ancestors) {
    const s = context.source
    if(s.startsWith("</")){
        for (let i = ancestors.length-1; i >= 0 ; i--) {
            const tag = ancestors[i].tag;
            // 2.当遇到任意结束标签的时候
            if(startsWithEndTagOpen(s,tag)){
                return true
            }

        }
    }
    // 1.source有值的时候
    return !s
}



/**
 * 解析text
 * @param context 
 * @returns 
 */
function parseText(context: any): any {
    
    //孩子中可能有text，也有可能有插值语法,也可能为element，提取的text content应该为{{或<之前的内容
    const endTokens = ["{{","<"]
    let endIndex = context.source.length

    for (let i = 0; i < endTokens.length; i++) {
        const index = context.source.indexOf(endTokens[i])
        if(index!=-1 && endIndex > index) endIndex = index
    }

    //1.获取content
    const content = parseTextData(context,endIndex)

    console.log("textContent",content)

    return {
        type:NodeTypes.TEXT,
        content:content
    }
}

function parseTextData(context: any,length) {
    const content = context.source.slice(0, length)
    //2.推进
    advanceBy(context, content.length)
    return content
}

/**
 * 解析element标签
 * @param context 
 * @returns 
 */
function parseElement(context: any,ancestors) {
    // 1.解析tag
    const element:any = parseTag(context,TagType.Start)
    // 用栈ancestors收集element
    ancestors.push(element)
    element.children = parseChildren(context,ancestors)
    ancestors.pop()

    const s = context.source
    const tag = element.tag
    if(startsWithEndTagOpen(s, tag)){
        parseTag(context,TagType.End)
    }else{
        throw new Error(`缺少结束标签:${element.tag}`)
    }
    return element
}

function startsWithEndTagOpen(s: any, tag: any) {
    return s.startsWith("</") && tag.toLowerCase() === s.slice(2, 2 + tag.length).toLowerCase()
}

function parseTag(context: any,type:TagType) {
    const match: any = /^<\/?([a-z]*)/i.exec(context.source)
    const tag = match[1]
    // 2.删除处理完成的代码
    advanceBy(context, match[0].length + 1)
    if(type===TagType.End) return
    return {
        type: NodeTypes.ELEMENT,
        tag,
    }
}

/**
 * 解析插值语法
 * @param context 
 * @returns 
 */
function parseInterpolation(context) {
    const openDelimiter = "{{"
    const closeDelimiter = "}}"

    // 推进到{{后面
    const closeIndex = context.source.indexOf(closeDelimiter,openDelimiter.length)
    advanceBy(context, openDelimiter.length)
    // console.log("context.source:",context.source)  //message}}

    // 截取中间的内容并去除空格
    const rawContentLength = closeIndex - openDelimiter.length
    const rawContent = parseTextData(context,rawContentLength) //context.source.slice(0,rawContentLength)
    const content = rawContent.trim()
    // console.log("content:",content)  //message

    // 推进到}}后面
    advanceBy(context,closeDelimiter.length)
    // console.log("context.source:",context.source)
    return {
        type:NodeTypes.INTERPOLATION,
        content:{
            type:NodeTypes.SIMPLE_EXPRESSION,
            content:content
        }
    }
}




function advanceBy(context: any, length: number): any {
    context.source = context.source.slice(length)
}





