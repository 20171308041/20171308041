/**
 * @Description: 目标代码（X86）
 * @author shylocks
 * @date 2019/5/30
 */
/**
 * 目标代码类
 List quadrupleList 四元式字符串数组
 List targetCodeList 目标代码字符串数组
 */
class Assembly {
    quadrupleList;  // 四元式字符串数组
    targetCodeList = [];  // 目标代码字符串数组
    dataList = this.targetCodeList;  // 浅拷贝，统一数据格式，方便前端渲染
    now = 4;
    loop = false;

    nowSpace = () => new Array(this.now).join(" ");

    /**
     * 构造函数
     * @param content
     */
    constructor(content) {
        this.targetCodeList.push(".section .data");
        this.quadrupleList = JSON.parse(JSON.stringify(content));  // 深拷贝，避免浅拷贝带来的数组改变的问题
        this.quadrupleList.forEach(quadruple => {
            if (quadruple.op === "D") {
                this.targetCodeList.push(quadruple.result + ":\n    .string:" + quadruple.arg1 + "\n");
            }
        });
        let start = [".section .text", ".globl _start", "_start:"];
        start.forEach((v) => this.targetCodeList.push(v));
        this.quadrupleList.forEach(quadruple => {
            let res = null;
            switch (quadruple.op.charAt(0)) {
                case '=': {  // 如果是赋值
                    res = this.nowSpace() + "mov $" + quadruple.result + "," + quadruple.arg1;
                    break;
                }
                case '+': {  // 如果是增加
                    if (quadruple.op.charAt(1) === '+') {  // 自增
                        res = this.nowSpace() + "inc $" + quadruple.arg1;
                    } else {  // 加上某个数
                        this.targetCodeList.push(this.nowSpace() + "mov $" + quadruple.result + "," + quadruple.arg2);
                        res = this.nowSpace() + "add $" + quadruple.result + "," + quadruple.arg1;
                    }
                    break;
                }
                case '-': {  // 如果是减去
                    if (quadruple.op.charAt(1) === '-') {  // 自减
                        res = this.nowSpace() + "dec $" + quadruple.arg1;
                    } else {  // 减去某个数
                        res = this.nowSpace() + "sub $" + quadruple.result + "," + quadruple.arg1;
                    }
                    break;
                }
                case '*': {  // 乘法，无符号数
                    res = this.nowSpace() + "mul $" + quadruple.result + "," + quadruple.arg1;
                    break;
                }
                case '/': {  // 除法，无符号数
                    res = this.nowSpace() + "div $" + quadruple.result + "," + quadruple.arg1;
                    break;
                }
                case 'J': {
                    if (quadruple.op.charAt(1) === 'R') {  // 无条件跳转
                        res = this.nowSpace() + "jmp $" + quadruple.result;
                    } else if (quadruple.op.charAt(1) === 'F') {  // 若等于0则跳越，即寄存器ZF=1
                        res = this.nowSpace() + "jz $" + quadruple.result;
                    }
                    break;
                }
                case '>': {
                    this.targetCodeList.push(this.nowSpace() + "cmp $" + quadruple.arg1 + ",$" + quadruple.result);
                    if (quadruple.op.charAt(1) === '=') {
                        if (this.loop) res = this.nowSpace() + "jge end_loop";
                        else res = this.nowSpace() + "jge $" + quadruple.result;  // 若不低于或等于则跳越
                    } else {   // 若大于则跳越
                        if (this.loop) res = this.nowSpace() + "jg end_loop";
                        else res = this.nowSpace() + "jg $" + quadruple.result;
                    }
                    break;
                }
                case '<': {
                    this.targetCodeList.push(this.nowSpace() + "mov $" + quadruple.result + "," + quadruple.arg2);
                    this.targetCodeList.push(this.nowSpace() + "cmp $" + quadruple.arg1 + ",$" + quadruple.result);
                    if (quadruple.op.charAt(1) === '=') { // 若低于或等于则跳越
                        if (this.loop) res = this.nowSpace() + "jle end_loop";
                        else res = this.nowSpace() + "jle $" + quadruple.result;
                    } else {   // 若低于则跳越
                        if (this.loop) res = this.nowSpace() + "jl end_loop";
                        else res = this.nowSpace() + "jl $" + quadruple.result;
                    }
                    break;
                }
                case 'P':
                    let print_code = [this.nowSpace() + "mov $4, %eax",
                        this.nowSpace() + "mov $1, %ebx",
                        this.nowSpace() + "mov $" + quadruple.arg1 + ", %ecx",
                        this.nowSpace() + "mov $13, %edx",
                        this.nowSpace() + "int $0x80"];
                    print_code.forEach(v => this.targetCodeList.push(v));
                    break;
                case 'F':
                    this.targetCodeList.push(this.nowSpace() + "start_loop:");
                    this.loop = true;
                    this.now +=4;
                    break;
                case 'R':
                    this.targetCodeList.push(this.nowSpace() + "jmp start_loop");
                    this.now -=4;
                    this.targetCodeList.push(this.nowSpace() + "end_loop" + ":");
                    this.now +=4;
                    break;
                default: {
                    res = null;
                }
            }
            if (res) {  // 如果不是null
                this.targetCodeList.push(res);
            }
        });
    }
}