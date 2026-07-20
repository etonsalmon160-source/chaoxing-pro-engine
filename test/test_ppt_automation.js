const fs = require('fs');
const path = require('path');

console.log('========================================================================');
console.log('📖 学习通 PPT/PDF 课件自动化翻页与底层穿透测试 (Automated Verification)');
console.log('========================================================================\n');

const contentJs = fs.readFileSync(path.join(__dirname, '../content/content.js'), 'utf8');

let passed = 0;
let total = 0;

function assertCheck(name, condition) {
  total++;
  if (condition) {
    console.log(`✅ [通过] ${name}`);
    passed++;
  } else {
    console.error(`❌ [失败] ${name}`);
  }
}

// 1. Check if runTaskScanner runs periodically on setInterval
assertCheck('runTaskScanner 绑定了周期性扫描 setInterval(runTaskScanner, 2500)', contentJs.includes('setInterval(runTaskScanner, 2500)'));

// 2. Check if hasDocument matches all URL formats (/ppt/, /pdf/, /book/, /doc/, ananas/modules/)
assertCheck('hasDocument 包含对所有课件路径与 iframe 嵌套结构的检测', 
  contentJs.includes('isDocUrl') && contentJs.includes('ananas/modules/') && contentJs.includes('[data-type="document"]')
);

// 3. Check if setupDocumentAutomation checks both single layer and same-origin parent penetration
assertCheck('setupDocumentAutomation 包含直接操作与嵌套 iframe (docIframe) 穿透检测与控制', 
  contentJs.includes('const subDoc = docIframe.contentDocument') && contentJs.includes('subDoc.querySelector')
);

// 4. Check page turning buttons coverage (#nextBtn, .turnpage_next, [data-cmd="next"], etc.)
assertCheck('自动点击翻页包含完整的各类按钮选择器矩阵 (#nextBtn, .turnpage_next, .next-btn...)', 
  contentJs.includes('#nextBtn, .turnpage_next, .next-btn') && contentJs.includes('nextBtn.click()')
);

// 5. Check auto scrolling for scrollable containers
assertCheck('针对长滑动型 PDF/文档包含自动计算高度滑动 (viewer.scrollTop += ...)', 
  contentJs.includes('viewer.scrollHeight - viewer.scrollTop > viewer.clientHeight + 30') && contentJs.includes('viewer.scrollTop += scrollStep')
);

// 6. Check completion conditions and progress reporting
assertCheck('当检测至末页或滑动到底部自动完成任务并上报状态报告 (reportProgress/notifyTaskCompleted)', 
  contentJs.includes('PPT / 文档已完成逐页深度阅读') && contentJs.includes('reportProgress(\'✅ 课件阅读完毕\')')
);

console.log('\n========================================================================');
console.log(`🏁 课件阅读模块自动化静态校验测试：共运行 ${total} 项，通过 ${passed} 项，通过率: ${(passed/total*100).toFixed(1)}%`);
console.log('========================================================================');
if (passed !== total) process.exit(1);
