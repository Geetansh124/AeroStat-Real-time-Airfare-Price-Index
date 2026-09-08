/**
 * AeroStat - Automated Button & Control Verification Test
 * Can be executed in browser DevTools or invoked via UI Test Runner
 */

function runVerification() {
  console.log("==================================================");
  console.log("   AeroStat Prototype - Button Verification Test  ");
  console.log("==================================================");

  if (typeof window !== "undefined" && typeof window.runAeroStatDiagnostics === "function") {
    const results = window.runAeroStatDiagnostics();
    console.log(`\nResult: ${results.passed} / ${results.total} controls passed (${((results.passed/results.total)*100).toFixed(0)}%) in ${results.elapsed}ms.`);
    return results;
  } else {
    console.log("This test is designed to run in the AeroStat browser environment (http://localhost:8000).");
    console.log("Click 'Test All Buttons' in the sidebar footer or call window.runAeroStatDiagnostics().");
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { runVerification };
}
if (typeof window !== "undefined") {
  window.runVerification = runVerification;
}
