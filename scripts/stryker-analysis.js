#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  console.log('📊 Analyzing Stryker Mutation Test Report...\n');

  const reportData = fs.readFileSync(path.join(__dirname, '../reports/mutation/mutation-report.json'), 'utf8');
  const report = JSON.parse(reportData);

  // Extract metrics from files
  const files = report.files;
  let totalKilled = 0;
  let totalSurvived = 0;
  let totalNoCoverage = 0;
  let totalTimeout = 0;
  let totalCompileErrors = 0;

  const fileAnalysis = Object.entries(files)
    .map(([filePath, fileData]) => {
      const mutants = fileData.mutants || [];
      let killed = 0;
      let survived = 0;
      let noCoverage = 0;
      let timeout = 0;
      let compileErrors = 0;

      mutants.forEach((mutant) => {
        switch (mutant.status) {
          case 'Killed':
            killed++;
            break;
          case 'Survived':
            survived++;
            break;
          case 'NoCoverage':
            noCoverage++;
            break;
          case 'Timeout':
            timeout++;
            break;
          case 'CompileError':
            compileErrors++;
            break;
        }
      });

      const fileTotal = killed + survived + noCoverage + timeout + compileErrors;
      const fileScore = fileTotal > 0 ? killed / fileTotal : 0;

      totalKilled += killed;
      totalSurvived += survived;
      totalNoCoverage += noCoverage;
      totalTimeout += timeout;
      totalCompileErrors += compileErrors;

      return {
        path: filePath,
        score: fileScore,
        killed,
        survived,
        noCoverage,
        timeout,
        compileErrors,
        total: fileTotal,
      };
    })
    .filter((file) => file.total > 0)
    .sort((a, b) => a.score - b.score); // Worst scores first

  const totalMutants = totalKilled + totalSurvived + totalNoCoverage + totalTimeout + totalCompileErrors;
  const mutationScore = totalMutants > 0 ? totalKilled / totalMutants : 0;

  console.log('🎯 MUTATION TESTING SUMMARY');
  console.log('============================');
  console.log(`📈 Overall Mutation Score: ${(mutationScore * 100).toFixed(2)}%`);
  console.log(`✅ Killed Mutants: ${totalKilled}`);
  console.log(`❌ Survived Mutants: ${totalSurvived}`);
  console.log(`🚫 No Coverage Mutants: ${totalNoCoverage}`);
  console.log(`⏰ Timeout Mutants: ${totalTimeout}`);
  console.log(`💥 Compile Error Mutants: ${totalCompileErrors}`);
  console.log(`📊 Total Mutants: ${totalMutants}`);
  console.log(`📁 Files Analyzed: ${fileAnalysis.length}`);
  console.log('');

  // Show top 30 worst files
  console.log('📁 WORST PERFORMING FILES (Top 30)');
  console.log('===================================');

  fileAnalysis.slice(0, 30).forEach((file, index) => {
    const scorePercent = (file.score * 100).toFixed(2);
    const status =
      file.score === 0 ? '🔴 CRITICAL' : file.score < 0.3 ? '🟠 POOR' : file.score < 0.7 ? '🟡 FAIR' : '🟢 GOOD';

    console.log(`${index + 1}. ${status} ${scorePercent}% - ${file.path}`);
    console.log(`   Survived: ${file.survived}, Killed: ${file.killed}, No Coverage: ${file.noCoverage}`);
    if (file.timeout > 0) console.log(`   Timeouts: ${file.timeout}`);
    if (file.compileErrors > 0) console.log(`   Compile Errors: ${file.compileErrors}`);
    console.log('');
  });

  // Generate recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('==================');

  const criticalFiles = fileAnalysis.filter((f) => f.score === 0);
  const poorFiles = fileAnalysis.filter((f) => f.score > 0 && f.score < 0.3);
  const fairFiles = fileAnalysis.filter((f) => f.score >= 0.3 && f.score < 0.7);
  const goodFiles = fileAnalysis.filter((f) => f.score >= 0.7);

  if (criticalFiles.length > 0) {
    console.log(`🔴 CRITICAL ISSUES (0% mutation score - ${criticalFiles.length} files):`);
    console.log('   These tests are not catching any bugs and should be deleted or completely rewritten:');
    criticalFiles.slice(0, 15).forEach((file) => {
      console.log(`   • ${file.path} (${file.survived} survived mutants)`);
    });
    if (criticalFiles.length > 15) {
      console.log(`   ... and ${criticalFiles.length - 15} more critical files`);
    }
    console.log('');
  }

  if (poorFiles.length > 0) {
    console.log(`🟠 POOR TEST COVERAGE (0-30% mutation score - ${poorFiles.length} files):`);
    console.log('   These tests need major refactoring:');
    poorFiles.slice(0, 15).forEach((file) => {
      console.log(`   • ${file.path} (${(file.score * 100).toFixed(1)}% score, ${file.survived} survived)`);
    });
    if (poorFiles.length > 15) {
      console.log(`   ... and ${poorFiles.length - 15} more poor files`);
    }
    console.log('');
  }

  if (fairFiles.length > 0) {
    console.log(`🟡 FAIR TEST COVERAGE (30-70% mutation score - ${fairFiles.length} files):`);
    console.log('   These tests need minor improvements:');
    fairFiles.slice(0, 15).forEach((file) => {
      console.log(`   • ${file.path} (${(file.score * 100).toFixed(1)}% score, ${file.survived} survived)`);
    });
    if (fairFiles.length > 15) {
      console.log(`   ... and ${fairFiles.length - 15} more fair files`);
    }
    console.log('');
  }

  if (goodFiles.length > 0) {
    console.log(`🟢 GOOD TEST COVERAGE (70%+ mutation score - ${goodFiles.length} files):`);
    console.log('   These tests are performing well:');
    goodFiles.slice(0, 10).forEach((file) => {
      console.log(`   • ${file.path} (${(file.score * 100).toFixed(1)}% score)`);
    });
    if (goodFiles.length > 10) {
      console.log(`   ... and ${goodFiles.length - 10} more good files`);
    }
    console.log('');
  }

  console.log('📋 ACTION PLAN');
  console.log('==============');
  console.log('1. 🔴 DELETE tests for files with 0% mutation score (they provide no value)');
  console.log('2. 🟠 COMPLETELY REWRITE tests for files with <30% mutation score');
  console.log('3. 🟡 IMPROVE tests for files with 30-70% mutation score');
  console.log('4. ✅ KEEP and maintain tests for files with 70%+ mutation score');
  console.log('');
  console.log('🎯 FOCUS AREAS:');
  console.log('• Strengthen assertions to catch more edge cases');
  console.log('• Add tests for error conditions and boundary values');
  console.log('• Ensure tests validate actual business logic, not just happy paths');
  console.log('• Consider adding integration tests for complex business logic');
  console.log('');
  console.log('📊 STATISTICS:');
  console.log(`• Critical files (0%): ${criticalFiles.length}`);
  console.log(`• Poor files (0-30%): ${poorFiles.length}`);
  console.log(`• Fair files (30-70%): ${fairFiles.length}`);
  console.log(`• Good files (70%+): ${goodFiles.length}`);

  console.log('\n📄 HTML report available at: reports/mutation/mutation-report.html');
} catch (error) {
  console.error('Error analyzing mutation report:', error.message);
  process.exit(1);
}
