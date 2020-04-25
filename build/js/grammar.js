/**
 * @Description: 语法分析类
 * @author shylocks
 * @date 2019/5/31
 */

/**
 * 词法分析结果类
 String analyseStackString  当前分析栈
 String wordString          当前输入串
 String semanticStackString 当前语义栈
 */
class GrammarAnalyseResult {
    analyseStackString;  // 当前分析栈
    wordString;  // 当前输入串
    semanticStackString;  // 当前语义栈
    constructor(analyseStackString, wordString, semanticStackString) {  // 构造函数
        this.analyseStackString = analyseStackString;
        this.wordString = wordString;
        this.semanticStackString = semanticStackString;
    }
}

/**
 * ES5标准，为数组类型添加获取尾元素的操作，用来模拟栈
 * @returns {null|*}
 */
Array.prototype.top = function () {  // 获取栈顶元素
    if (this.length)  // 如果数组内有元素
        return this[this.length - 1];
    else
        return null;
};

/**
 * 词法分析类
 Lexical lexical       词法分析器
 List wordList         单词列表
 Stack analyseStack    分析栈
 Stack semanticStack   语义栈
 List analyseResult    语法分析过程
 List quadrupleList    四元式列表
 List errorList        错误信息列表
 Boolean errorFlag     语法分析出错标志
 List tempVariableList 临时变量列表
 */
class Grammar {
    lexical;  // 词法分析器
    wordList = [];  // 单词列表
    analyseStack = [];  // 分析栈
    semanticStack = [];  // 语义栈
    analyseResult = [];  // 语法分析过程
    quadrupleList = [];  // 四元式列表
    errorList = [];  //错误信息列表
    errorFlag = false;  // 语法分析出错标志
    tempVariableList = [];  // 临时变量列表
    dataList = this.analyseResult;  // 浅拷贝，统一数据格式，方便前端渲染
    /*私有变量*/
    if_fj = [];
    if_rj = [];
    while_fj = [];
    while_rj = [];
    for_fj = [];
    for_rj = [];
    for_op = [];
    op;
    arg1;
    arg2;
    res;

    /**
     * 构造函数
     * @param lexical 语法分析器
     */
    constructor(lexical) {  // 构造函数，继承词法分析结果
        this.lexical = lexical;
        this.wordList = lexical.wordList;
        if (this.wordList.length)
            this.analyse();
    }

    /**
     * 新建临时变量函数
     * @returns {string} 临时变量
     */
    newTempVariable = () => {
        const variable = "T" + (this.tempVariableList.length).toString();  // 创建新的临时变量，从T0开始
        this.tempVariableList.push(variable);  // 将新建的临时变量加入临时变量列表
        return variable;
    };
    /**
     * 新建全局变量函数
     * @returns {string} 临时变量
     */
    newVariable = () => {
        const variable = "T" + (this.tempVariableList.length).toString();  // 创建新的临时变量，从D0开始
        this.tempVariableList.push(variable);  // 将新建的临时变量加入临时变量列表
        return variable;
    };
    /**
     * 移进函数
     */
    forward = () => {
        this.analyseStack.pop();  // 弹出分析栈栈顶元素
        this.wordList.splice(0, 1);  // 弹出单词列表首元素
    };

    /**
     * 新建错误实例函数
     * @param info 错误信息
     * @param word 错误的单词
     */
    newError = (info, word) => {
        this.forward();  // 调用移进函数
        this.errorList.push(new Error(info, word.line, word.value));  // 新建错误实例放入栈
        this.errorFlag = true;  // 置出错标识为真
    };

    /**
     * 返回函数，用来判断if,while等语句
     * @param i
     * @param res
     */
    backPatch = (i, res) => {
        console.log(i, res);
        this.quadrupleList[i - 1].result = res.toString();
    };

    /**
     * 终结符处理函数
     * @param symbol 分析栈栈顶元素
     * @param word 单词列表首单词
     */
    terminalSymbol = (symbol, word) => {
        if (Word.isConst(word) || symbol === word.value) {  // 如果是常量
            this.forward();
        } else if (symbol === "id" && word.type === Word.IDENTIFIER) {  // 如果单词是标识符，并且分析栈栈顶元素是id
            this.forward();
        } else {  // 都不符合，出错
            this.newError("语法错误", word);
        }
    };

    /**
     * 非终结符处理函数
     * @param symbol 分析栈栈顶元素
     * @param word 单词列表首单词
     */
    nonTerminalSymbol(symbol, word) {
        let p = ["Z'", "U'", "E'", "H'", "L'", "T'"];
        if (p.includes(symbol)) {  // 如果是带'的符号，需要特殊处理，便于使用switch
            symbol = (p.indexOf(symbol) + 1).toString();  // 将索引位置转化为字符
        }
        let production = [];  // 产生式列表
        let forwardProduction = () => {  // 移进
            this.analyseStack.pop();  // 弹出栈顶元素
            production.forEach((v) => {
                if (v.name) this.analyseStack.push(v);  // 如果已经是AnalyseNode类型的，即产生式左边的符号，直接加入栈
                else this.analyseStack.push(new AnalyseNode(v));  // 如果不是，新建结点入栈
            });
        };
        switch (symbol.charAt(0)) {
            case 'S':  // 开始符号
                if (word.value === 'void') {  // S->void main ( ) { A }
                    production = ['}', grammarObject.A, '{', ')', '(', 'main', 'void'];
                    forwardProduction();
                } else {  // 设计主函数以void开始，暂不考虑设计函数
                    this.newError("主函数没有返回值", word);
                }
                break;
            case 'A': {
                if (word.value !== 'else' && Word.isNotStartKey(word.value)) {  // A->C A
                    production = [grammarObject.A, grammarObject.C];
                } else if (word.type === Word.IDENTIFIER) {  // A->C A
                    production = [grammarObject.A, grammarObject.C];
                } else {  // A->ε
                    production = [];
                }
                forwardProduction();
                break;
            }
            case 'B': {
                if (word.value === "printf") {  // B->printf ( P ) A ;
                    production = [new AnalyseNode(';', AnalyseNode.TERMINAL_SYMBOL), grammarObject.A,
                        new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL), grammarObject.P,
                        new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("printf", AnalyseNode.ACTION_SYMBOL)
                    ];
                } else if (word.value === "scanf") {  // B->scanf ( id ) A ;
                    production = [new AnalyseNode(';', AnalyseNode.TERMINAL_SYMBOL), grammarObject.A,
                        new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("scanf", AnalyseNode.ACTION_SYMBOL)
                    ];
                } else if (word.value === "if") {  // B->if ( G ) IF_FJ { A } IF_BACKPATCH_FJ IF_RJ else { A } IF_BACKPATCH_RJ
                    production = [grammarObject.IF_BACKPATCH_RJ,
                        new AnalyseNode('}', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.A,
                        new AnalyseNode('{', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("else", AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.IF_RJ,
                        grammarObject.IF_BACKPATCH_FJ,
                        new AnalyseNode('}', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.A,
                        new AnalyseNode('{', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.IF_FJ,
                        new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.G,
                        new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("if", AnalyseNode.TERMINAL_SYMBOL),
                    ];
                } else if (word.value === "while") {  // B->while ( G ) WHILE_FJ { A } WHILE_RJ WHILE_BACKPATCH_FJ
                    production = [
                        grammarObject.WHILE_RJ,
                        grammarObject.WHILE_BACKPATCH_FJ,
                        new AnalyseNode('}', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.A,
                        new AnalyseNode('{', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.WHILE_FJ,
                        new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.G,
                        new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("while", AnalyseNode.TERMINAL_SYMBOL)
                    ];
                } else if (word.value === "for") {  // B-> for ( Y Z; FOR_FJ G ; Q) { A SINGLE } FOR_RJ FOR_BACKPATCH_FJ
                    production = [
                        grammarObject.FOR_BACKPATCH_FJ,
                        grammarObject.FOR_RJ,
                        new AnalyseNode('}', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.SINGLE,
                        grammarObject.A,
                        new AnalyseNode('{', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.Q,
                        new AnalyseNode(';', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.G,
                        grammarObject.FOR_FJ,
                        new AnalyseNode(';', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.Z,
                        grammarObject.Y,
                        new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("for", AnalyseNode.TERMINAL_SYMBOL),
                    ];
                } else {  // B->ε
                    production = [];
                }
                forwardProduction();
                break;
            }
            case 'C':  // C->X B R
                production = [grammarObject.R, grammarObject.B, grammarObject.X];
                forwardProduction();
                break;
            case 'X':
                if (Word.isDataType(word.value)) {  // X->Y Z ;
                    production = [new AnalyseNode(';', AnalyseNode.TERMINAL_SYMBOL), grammarObject.Z, grammarObject.Y];
                } else {  // X->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'Y':
                if (Word.isDataType(word.value)) {  // Y->int | bool | char
                    production = [new AnalyseNode(word.value, AnalyseNode.TERMINAL_SYMBOL)];
                    forwardProduction();
                } else {
                    this.newError("非法数据类型", word);
                }
                break;
            case 'Z':
                if (word.type === Word.IDENTIFIER) {  // Z-> U Z'
                    production = [grammarObject.Z1, grammarObject.U];
                    forwardProduction();
                } else {
                    this.newError("非法标识符", word);
                }
                break;
            case '1':  // Z'
                if (word.value === ',') {  // Z'-> , Z
                    production = [grammarObject.Z, new AnalyseNode(word.value, AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // Z'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'U':
                if (word.type === Word.IDENTIFIER) {  // U-> U' id ASS_U
                    production = [
                        grammarObject.U1, new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_U];
                    forwardProduction();
                } else {
                    this.newError("非法标识符", word);
                }
                break;
            case '2':  // U'
                if (word.value === '=') {  // U'->@EQ_U' L =
                    production = [grammarObject.EQ_U1, grammarObject.L, new AnalyseNode(word.value, AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // U'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'R':
                if (word.type === Word.IDENTIFIER) {  // R-> @ASS_R id = L @EQ ;
                    production = [
                        new AnalyseNode(";", AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.EQ, grammarObject.L,
                        new AnalyseNode("=", AnalyseNode.TERMINAL_SYMBOL),
                        new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_R,
                    ];
                } else {  // R->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'P':
                if (word.type === Word.IDENTIFIER) {  //P->@ASS_P id
                    production = [new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_P];
                    forwardProduction();
                } else if (word.type === Word.INT_CONST) {  // P->@ASS_P num
                    production = [new AnalyseNode("num", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_P];
                    forwardProduction();
                } else if (word.type === Word.CHAR_CONST) {  // P->@ASS_P ch
                    production = [new AnalyseNode("ch", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_P];
                    forwardProduction();
                } else if (word.type === Word.STRING_CONST) {
                    production = [new AnalyseNode("str", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_P];
                    forwardProduction();
                } else {
                    this.newError("不能识别的数据类型", word);
                }
                break;
            case 'E':
                if (word.type === Word.IDENTIFIER || word.type === Word.INT_CONST || word.value === '(') {  //E->H E1
                    production = [grammarObject.E1, grammarObject.H];
                    forwardProduction();
                } else {
                    this.newError("数据类型无法进行算数运算", word);
                }
                break;
            case '3':  // E'
                if (word.value === '=') {  // E'->E &&
                    production = [grammarObject.E, new AnalyseNode("&&", AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // E'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'H':
                if (word.type === Word.IDENTIFIER || word.type === Word.INT_CONST || word.value === '(') {  //H->G H1
                    production = [grammarObject.H1, grammarObject.G];
                    forwardProduction();
                } else {
                    this.newError("数据类型无法进行算术运算", word);
                }
                break;
            case '4':  // H'
                if (word.value === "||") {  // H'->E ||
                    production = [grammarObject.E, new AnalyseNode("||", AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // H'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'D':
                if (Word.isComparisonOperator(word.value)) {  // D-> == @COMPARE_OP | != @COMPARE_OP | > @COMPARE_OP| < @COMPARE_OP
                    production = [new AnalyseNode(word.value, AnalyseNode.TERMINAL_SYMBOL), grammarObject.COMPARE_OP];
                    forwardProduction();
                } else {
                    this.newError("非法运算符", word);
                }
                break;
            case 'G':
                if (word.type === Word.IDENTIFIER || word.type === Word.INT_CONST) {  // G->F D F @COMPARE
                    production = [grammarObject.COMPARE, grammarObject.F, grammarObject.D, grammarObject.F];
                    forwardProduction();
                } else if (word.value === '(') { // G->( E )
                    production = [new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL), grammarObject.E, new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL)];
                    forwardProduction();
                } else if (word.value === '!') { // G->! E
                    production = [grammarObject.E, new AnalyseNode('!', AnalyseNode.TERMINAL_SYMBOL)];
                    forwardProduction();
                } else {
                    this.newError("数据类型无法进行算术运算或括号不匹配", word);
                }
                break;
            case 'L':
                if (word.type === Word.IDENTIFIER || word.type === Word.INT_CONST || word.type === Word.CHAR_CONST || word.type === Word.BOOL_CONST || word.value === '(') {  // L->T L' @ADD_SUB
                    production = [grammarObject.ADD_SUB, grammarObject.L1, grammarObject.T];
                    forwardProduction();
                } else {
                    this.newError("算数据类型无法进行算术运算或括号不匹配", word);
                }
                break;
            case '5':  // L'
                if (word.value === '+') {  // L'->+ L @ADD
                    production = [grammarObject.ADD, grammarObject.L, new AnalyseNode('+', AnalyseNode.TERMINAL_SYMBOL)];
                } else if (word.value === '-') {  // L'->- L @SUB
                    production = [grammarObject.SUB, grammarObject.L, new AnalyseNode('+', AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // L'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'T':
                if (word.type === Word.IDENTIFIER || word.type === Word.INT_CONST || word.type === Word.CHAR_CONST || word.type === Word.BOOL_CONST || word.value === '(') {  // T->F T' @DIV_MUL
                    production = [grammarObject.DIV_MUL, grammarObject.T1, grammarObject.F];
                    forwardProduction();
                } else {
                    this.newError("数据类型无法进行算术运算", word);
                }
                break;
            case '6':  // T'
                if (word.value === '*') {  // T'->* T @MUL
                    production = [grammarObject.MUL, grammarObject.T, new AnalyseNode('*', AnalyseNode.TERMINAL_SYMBOL)];
                } else if (word.value === '/') {  // T'->/ T @DIV
                    production = [grammarObject.DIV, grammarObject.T, new AnalyseNode('/', AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // T'->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'F':
                if (word.type === Word.IDENTIFIER) {  // F-> @ASS_F id
                    production = [new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_F];
                } else if (word.type === Word.INT_CONST || word.type === Word.BOOL_CONST) {  // F-> @ASS_F num
                    production = [new AnalyseNode("num", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_F];
                } else if (word.type === Word.CHAR_CONST) {  // F->@ASS_F ch
                    production = [new AnalyseNode("ch", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_F];
                } else if (word.value === '(') {  // F->( L )
                    production = [new AnalyseNode(')', AnalyseNode.TERMINAL_SYMBOL),
                        grammarObject.L, new AnalyseNode('(', AnalyseNode.TERMINAL_SYMBOL)];
                } else {  // F->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'O':
                if (Word.isSelfOperator(word.value)) {  // O-> @SINGLE_OP ++ | @SINGLE_OP --
                    production = [new AnalyseNode(word.value, AnalyseNode.TERMINAL_SYMBOL), grammarObject.SINGLE_OP]
                } else {  // O->ε
                    production = [];
                }
                forwardProduction();
                break;
            case 'Q':
                if (word.type === Word.IDENTIFIER) {  // Q-> @ASS_Q id O
                    production = [grammarObject.O, new AnalyseNode("id", AnalyseNode.TERMINAL_SYMBOL), grammarObject.ASS_Q];
                } else {  // Q->ε
                    production = [];
                }
                forwardProduction();
                break;
        }
    }

    /**
     * 动作符处理函数
     * @param symbol 分析栈栈顶元素
     * @param word 单词列表首单词
     */
    actionSymbol(symbol, word) {
        if (symbol === "printf") {
            this.op = "P";
            this.wordList.splice(0, 1);  // 弹出单词列表首元素
        } else if (symbol === "scanf") {
            this.op = "S";
            this.wordList.splice(0, 1);  // 弹出单词列表首元素
        } else if (symbol === "@ADD_SUB") {
            if (this.op != null && (this.op === "+" || this.op === "-")) {
                this.arg2 = this.semanticStack.pop();
                this.arg1 = this.semanticStack.pop();
                this.res = this.newTempVariable();
                this.quadrupleList.push(new Quadruple(this.op, this.arg1, this.arg2, this.res));
                this.semanticStack.push(this.res);
                this.op = null;
            }
        } else if (symbol === "@ADD") {
            this.op = "+";
        } else if (symbol === "@SUB") {
            this.op = "-";
        } else if (symbol === "@DIV_MUL") {
            if (this.op != null && (this.op === "*" || this.op === "/")) {
                this.arg2 = this.semanticStack.pop();
                this.arg1 = this.semanticStack.pop();
                this.res = this.newTempVariable();
                this.quadrupleList.push(new Quadruple(this.op, this.arg1, this.arg2, this.res));
                this.semanticStack.push(this.res);
                this.op = null;
            }
        } else if (symbol === "@DIV") {
            this.op = "/";
        } else if (symbol === "@MUL") {
            this.op = "*";
        } else if (symbol === "@TRAN_LF") {
        } else if (["@ASS_F", "@ASS_R", "@ASS_Q", "@ASS_U"].includes(symbol)) {
            this.semanticStack.push(word.value);
        } else if (symbol === "@ASS_P") {
            this.semanticStack.push(word.value);
            this.arg1 = this.semanticStack.pop();
            this.res = this.newVariable();
            if (word.type !== Word.IDENTIFIER) {
                this.quadrupleList.push(new Quadruple("D", this.arg1, "/", this.res));
                this.arg1 = this.res;
            }
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, "/", "/"));
        } else if (symbol === "@SINGLE") {
            if (this.for_op.top() != null) {
                this.arg1 = this.semanticStack.pop();
                this.res = this.arg1;
                this.quadrupleList.push(new Quadruple(this.for_op.pop(), this.arg1, "/", this.res));
            }
        } else if (symbol === "@SINGLE_OP") {
            this.for_op.push(word.value);
        } else if (symbol === "@EQ" || symbol === "@EQ_U'") {
            this.op = "=";
            this.arg1 = this.semanticStack.pop();
            this.res = this.semanticStack.pop();
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, "/", this.res));
            this.op = null;
        } else if (symbol === "@COMPARE") {
            this.arg2 = this.semanticStack.pop();
            this.op = this.semanticStack.pop();
            this.arg1 = this.semanticStack.pop();
            this.res = this.newTempVariable();
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, this.arg2, this.res));
            this.semanticStack.push(this.res);
            this.op = null;
        } else if (symbol === "@COMPARE_OP") {
            this.semanticStack.push(word.value);
        } else if (symbol === "@IF_FJ") {
            this.op = "FJ";
            this.arg1 = this.semanticStack.pop();
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, "/", this.res));
            this.if_fj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@IF_BACKPATCH_FJ") {
            this.backPatch(this.if_fj.pop(), this.quadrupleList.length);
        } else if (symbol === "@IF_RJ") {
            this.op = "RJ";
            this.quadrupleList.push(new Quadruple(this.op, "/", "/", "/"));
            this.if_rj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@IF_BACKPATCH_RJ") {
            this.backPatch(this.if_rj.pop(), this.quadrupleList.length);
        } else if (symbol === "@WHILE_FJ") {
            this.op = "FJ";
            this.arg1 = this.semanticStack.pop();
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, "/", "/"));
            this.while_fj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@WHILE_RJ") {
            this.op = "RJ";
            this.res = (this.while_rj.top() - 1).toString();
            this.quadrupleList.push(new Quadruple(this.op, "/", "/", this.res));
            this.while_rj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@WHILE_BACKPATCH_FJ") {
            this.backPatch(this.while_fj.pop(), this.quadrupleList.length + 1);
        } else if (symbol === "@FOR_FJ") {
            this.op = "FJ";
            this.arg1 = this.semanticStack.top();
            this.quadrupleList.push(new Quadruple(this.op, this.arg1, "/", "/"));
            this.for_fj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@FOR_RJ") {
            this.op = "RJ";
            this.res = (this.for_fj.top() - 1).toString();
            this.quadrupleList.push(new Quadruple(this.op, "/", "/", this.res));
            this.for_rj.push(this.quadrupleList.length);
            this.op = null;
        } else if (symbol === "@FOR_BACKPATCH_FJ") {
            this.backPatch(this.for_fj.pop(), this.quadrupleList.length + 1);
        }
        this.analyseStack.pop();
    }

    /**
     * LL(1)分析函数
     * */
    analyse() {
        let pushResult = () => {  // 将当前分析结果加入语法分析结果列表，语法糖
            let analyseStackString = '';
            this.analyseStack.forEach(v => analyseStackString += v.name);  // 箭头函数简写，下同
            let wordString = '';
            this.wordList.forEach(v => wordString += v.value);
            let semanticStackString = this.semanticStack.toString();  // 字符串数组直接调用toString()，等于.join('')
            this.analyseResult.push(new GrammarAnalyseResult(analyseStackString, wordString, semanticStackString));  // 语法分析结果
        };
        if (!this.lexical.errorFlag) {  // 如果词法分析未出错
            this.analyseStack.push(new AnalyseNode('$', AnalyseNode.END_SYMBOL));  // 符号栈放入终结符
            this.analyseStack.push(grammarObject.S);  // 放入文法开始符号
            this.semanticStack.push('$');  // 语义栈放入终结符
            let i=0;
            while (this.analyseStack.length && this.semanticStack.length&&++i<=5000) {  // 如果符号栈与语义栈均不为空
                pushResult();
                if (!this.wordList.length) {  // 输入串为空，说明词法分析有BUG，未识别出错误的符号
                    this.errorFlag = true;
                    break;
                }
                let top = this.analyseStack.top();  // 当前栈顶元素
                let word = this.wordList[0];  // 待分析单词
                if (word.value === '$' && top.name === '$') {  // 分析结束，待分析单词与栈顶元素均为结束符
                    this.forward();  // 弹出所有元素，结束while循环
                } else if (top.name === '$') {  // 分析栈结束，输入串未结束，出错
                    this.analyseStack.pop();  // 弹出分析栈元素
                    this.errorFlag = true;  // 将错误标志置为真
                } else if (AnalyseNode.isTerminalSymbol(top)) {  // 栈顶是终结符
                    this.terminalSymbol(top.name, word);
                } else if (AnalyseNode.isNonTerminalSymbol(top)) {  // 栈顶是非终结符
                    this.nonTerminalSymbol(top.name, word);
                } else if (AnalyseNode.isActionSymbol(top)) {  // 栈顶是动作符
                    this.actionSymbol(top.name, word);
                }
            }
        }
    }
}