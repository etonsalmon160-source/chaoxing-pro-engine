// Automated Test Suite for AI Protocol Robustness & Fuzzy Choice Matching Engine
// Tests cleanAIAnswerString, parseAnswers, calculateStringSimilarity, and findMatchingOption

const fs = require('fs');
const path = require('path');

// Mock DOM Option Element
class MockOptionElement {
  constructor(text, id = '', value = '') {
    this.textContent = text;
    this.input = { id, value };
  }
  querySelector(sel) {
    if (sel === 'input') return this.input;
    return null;
  }
}

// Extract Functions directly from our content.js for testing
const contentCode = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');

// Evaluate the functions in an isolated scope
const funcs = (() => {
  const code = `
    ${contentCode.match(/function cleanAIAnswerString[\s\S]*?^}/m)[0]}
    ${contentCode.match(/function parseAnswers[\s\S]*?^}/m)[0]}
    ${contentCode.match(/function calculateStringSimilarity[\s\S]*?^}/m)[0]}
    ${contentCode.match(/function findMatchingOption[\s\S]*?^}/m)[0]}
    return { cleanAIAnswerString, parseAnswers, calculateStringSimilarity, findMatchingOption };
  `;
  return new Function(code)();
})();

const cleanAIAnswerString = funcs.cleanAIAnswerString;
const parseAnswers = funcs.parseAnswers;
const calculateStringSimilarity = funcs.calculateStringSimilarity;
const findMatchingOption = funcs.findMatchingOption;

// Mock sendLog function since findMatchingOption calls sendLog
global.sendLog = (msg, level) => {
  // Silent during automated test run unless verbose
};

console.log('========================================================================');
console.log('🧠 学习通插件 AI 智能答题鲁棒性与模糊词识别 (Fuzzy Recognition) 自动化测试');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assertTest(testName, actual, expected) {
  total++;
  const isMatch = (actual === expected) || (Array.isArray(actual) && Array.isArray(expected) && actual.join(',') === expected.join(','));
  if (isMatch) {
    passed++;
    console.log(`✅ [通过] ${testName}`);
  } else {
    console.log(`❌ [失败] ${testName} -> 期望: "${expected}", 实际: "${actual}"`);
  }
}

// -------------------------------------------------------------------------
// Section 1: AI 冗余前缀与 Markdown 清洗测试 (cleanAIAnswerString)
// -------------------------------------------------------------------------
console.log('--- 1. AI 冗余输出格式清洗测试 ---');
assertTest('标准纯字母', cleanAIAnswerString('B'), 'B');
assertTest('Markdown 加粗字母', cleanAIAnswerString('**C**'), 'C');
assertTest('Markdown 代码块包围', cleanAIAnswerString('```json\nB\n```'), 'B');
assertTest('带【正确答案】前缀', cleanAIAnswerString('【正确答案】A'), 'A');
assertTest('带“参考答案：”前缀', cleanAIAnswerString('参考答案：D'), 'D');
assertTest('带“建议选择：”与完整选项文字', cleanAIAnswerString('建议选择：B. 细胞膜由双层磷脂构成'), 'B. 细胞膜由双层磷脂构成');
assertTest('带“答案是：”前缀', cleanAIAnswerString('答案是：对'), '对');
assertTest('被中文方括号包围的答案', cleanAIAnswerString('「正确」'), '正确');

// -------------------------------------------------------------------------
// Section 2: 多选题列表拆分鲁棒性测试 (parseAnswers)
// -------------------------------------------------------------------------
console.log('\n--- 2. 多选题答案拆分与识别测试 ---');
assertTest('连续多选字母 ABC', parseAnswers('ABC', true), ['A', 'B', 'C']);
assertTest('逗号分隔字母 A, B, D', parseAnswers('A, B, D', true), ['A', 'B', 'D']);
assertTest('顿号与连接词 A、B 和 D', parseAnswers('A、B 和 D', true), ['A', 'B', 'D']);
assertTest('中文文本多选逗号分割', parseAnswers('红细胞, 白细胞, 血小板', true), ['红细胞', '白细胞', '血小板']);

// -------------------------------------------------------------------------
// Section 3: 模糊词识别与文本相似度测试 (calculateStringSimilarity)
// -------------------------------------------------------------------------
console.log('\n--- 3. 模糊词语义相似度计算测试 ---');
const sim1 = calculateStringSimilarity('细胞膜由双层磷脂分子构成', '细胞膜是由双层磷脂分子构成的');
assertTest('同义近义微调相似度 (>0.85)', sim1 > 0.85, true);

const sim2 = calculateStringSimilarity('计算机网络协议分为七层架构', '网络协议分为七层');
assertTest('包含关系/精简回答相似度 (>0.75)', sim2 > 0.75, true);

// -------------------------------------------------------------------------
// Section 4: DOM 选项智能匹配测试 (findMatchingOption)
// -------------------------------------------------------------------------
console.log('\n--- 4. DOM 选项智能鲁棒匹配测试 ---');

const mockOptionsSingle = [
  new MockOptionElement('A. 细胞核', 'opt_A', 'A'),
  new MockOptionElement('B. 细胞质基质', 'opt_B', 'B'),
  new MockOptionElement('C. 细胞膜由双层磷脂分子构成', 'opt_C', 'C'),
  new MockOptionElement('D. 线粒体提供动力', 'opt_D', 'D')
];

// Test 4.1: Direct letter match from noisy AI response
assertTest('直接字母匹配 (AI输出: "**C**")', findMatchingOption(mockOptionsSingle, '**C**').textContent, 'C. 细胞膜由双层磷脂分子构成');
assertTest('带前缀字母匹配 (AI输出: "【答案】B")', findMatchingOption(mockOptionsSingle, '【答案】B').textContent, 'B. 细胞质基质');

// Test 4.2: Fuzzy Text Recognition (when AI outputs exact or slightly rephrased text without letter)
assertTest('精准文字内容匹配', findMatchingOption(mockOptionsSingle, '线粒体提供动力').textContent, 'D. 线粒体提供动力');
assertTest('模糊词匹配 (AI多字/错字: "细胞膜是由双层磷脂构成的")', findMatchingOption(mockOptionsSingle, '细胞膜是由双层磷脂构成的').textContent, 'C. 细胞膜由双层磷脂分子构成');

// Test 4.3: True/False Robustness
const mockOptionsTF = [
  new MockOptionElement('正确', 'tf_1', 'true'),
  new MockOptionElement('错误', 'tf_0', 'false')
];
assertTest('判断题正确 (AI输出: "对")', findMatchingOption(mockOptionsTF, '对').textContent, '正确');
assertTest('判断题正确 (AI输出: "√")', findMatchingOption(mockOptionsTF, '√').textContent, '正确');
assertTest('判断题错误 (AI输出: "建议选择：错误")', findMatchingOption(mockOptionsTF, '建议选择：错误').textContent, '错误');

console.log('\n========================================================================');
console.log(`🏁 测试完毕：共运行 ${total} 个用例，通过 ${passed} 个，通过率: ${((passed/total)*100).toFixed(1)}%`);
console.log('========================================================================');
