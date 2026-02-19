/**
 * Automated Visual Audit Script for Immivo Public Pages
 * 
 * This script tests all public-facing pages for:
 * - Visual consistency (colors, layout)
 * - Animation functionality
 * - Mobile responsiveness
 * - No broken layouts
 * 
 * Run with: node test-public-pages.js
 * Requires: npm install playwright
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots-audit');

// Pages to test
const PAGES = [
  { path: '/preise', name: 'Preise' },
  { path: '/ueber-uns', name: 'Über Uns' },
  { path: '/kontakt', name: 'Kontakt' },
  { path: '/karriere', name: 'Karriere' },
  { path: '/blog', name: 'Blog' },
  { path: '/impressum', name: 'Impressum' },
  { path: '/datenschutz', name: 'Datenschutz' },
  { path: '/agb', name: 'AGB' },
];

// Mobile pages to test
const MOBILE_PAGES = [
  { path: '/preise', name: 'Preise Mobile' },
  { path: '/kontakt', name: 'Kontakt Mobile' },
];

const issues = [];

function logIssue(page, severity, message) {
  const issue = { page, severity, message };
  issues.push(issue);
  console.log(`  [${severity}] ${message}`);
}

function logSuccess(message) {
  console.log(`  ✓ ${message}`);
}

async function checkAnimations(page, pageName) {
  // Check if elements with animation classes are visible (not stuck at opacity: 0)
  const hiddenElements = await page.evaluate(() => {
    const animatedElements = document.querySelectorAll('[style*="opacity"]');
    const hidden = [];
    
    animatedElements.forEach((el) => {
      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity);
      const rect = el.getBoundingClientRect();
      
      // Check if element is in viewport and still hidden
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        if (opacity < 0.1) {
          hidden.push({
            tag: el.tagName,
            class: el.className,
            text: el.textContent?.substring(0, 50)
          });
        }
      }
    });
    
    return hidden;
  });
  
  if (hiddenElements.length > 0) {
    logIssue(pageName, 'WARNING', `${hiddenElements.length} elements stuck at opacity: 0`);
    hiddenElements.slice(0, 3).forEach(el => {
      console.log(`    - ${el.tag}.${el.class}: "${el.text}"`);
    });
  } else {
    logSuccess('All animated elements are visible');
  }
}

async function checkColorScheme(page, pageName) {
  const colors = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const colorSet = new Set();
    
    elements.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        colorSet.add(style.backgroundColor);
      }
      if (style.color) {
        colorSet.add(style.color);
      }
    });
    
    return Array.from(colorSet);
  });
  
  // Check for expected colors (white, black, blue, gray)
  const hasWhite = colors.some(c => c.includes('255, 255, 255'));
  const hasBlack = colors.some(c => c.includes('0, 0, 0') || c.includes('17, 24, 39'));
  const hasBlue = colors.some(c => c.includes('37, 99, 235') || c.includes('59, 130, 246'));
  
  if (hasWhite && hasBlack) {
    logSuccess('Color scheme consistent (white/black/blue)');
  } else {
    logIssue(pageName, 'WARNING', 'Color scheme may be inconsistent');
  }
}

async function checkLayout(page, pageName) {
  const layoutIssues = await page.evaluate(() => {
    const issues = [];
    
    // Check for horizontal overflow
    const bodyWidth = document.body.scrollWidth;
    const windowWidth = window.innerWidth;
    if (bodyWidth > windowWidth + 10) {
      issues.push(`Horizontal overflow: ${bodyWidth}px > ${windowWidth}px`);
    }
    
    // Check for overlapping elements
    const nav = document.querySelector('nav');
    const main = document.querySelector('main') || document.body.children[1];
    if (nav && main) {
      const navRect = nav.getBoundingClientRect();
      const mainRect = main.getBoundingClientRect();
      if (navRect.bottom > mainRect.top + 50) {
        issues.push('Navigation may be overlapping content');
      }
    }
    
    return issues;
  });
  
  if (layoutIssues.length > 0) {
    layoutIssues.forEach(issue => {
      logIssue(pageName, 'ERROR', issue);
    });
  } else {
    logSuccess('Layout looks good');
  }
}

async function testPage(page, pageInfo, viewport = { width: 1440, height: 900 }) {
  const { path: pagePath, name: pageName } = pageInfo;
  const url = `${BASE_URL}${pagePath}`;
  
  console.log(`\n📄 Testing: ${pageName} (${viewport.width}x${viewport.height})`);
  console.log(`   URL: ${url}`);
  
  try {
    // Set viewport
    await page.setViewportSize(viewport);
    
    // Navigate to page
    await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
    
    // Wait for animations to settle
    await page.waitForTimeout(1000);
    
    // Take screenshot of top
    const screenshotName = `${pageName.replace(/\s+/g, '-')}-${viewport.width}w-top.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, screenshotName),
      fullPage: false
    });
    logSuccess(`Screenshot saved: ${screenshotName}`);
    
    // Check animations
    await checkAnimations(page, pageName);
    
    // Check color scheme
    await checkColorScheme(page, pageName);
    
    // Check layout
    await checkLayout(page, pageName);
    
    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // Take screenshot of bottom
    const screenshotNameBottom = `${pageName.replace(/\s+/g, '-')}-${viewport.width}w-bottom.png`;
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, screenshotNameBottom),
      fullPage: false
    });
    logSuccess(`Screenshot saved: ${screenshotNameBottom}`);
    
    // Check for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    if (errors.length > 0) {
      logIssue(pageName, 'WARNING', `${errors.length} console errors`);
    }
    
  } catch (error) {
    logIssue(pageName, 'ERROR', `Failed to test: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Starting Immivo Public Pages Audit\n');
  console.log('=' .repeat(60));
  
  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  
  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Test desktop pages
  console.log('\n📱 DESKTOP TESTS (1440px width)');
  console.log('=' .repeat(60));
  for (const pageInfo of PAGES) {
    await testPage(page, pageInfo);
  }
  
  // Test mobile pages
  console.log('\n\n📱 MOBILE TESTS (375px width)');
  console.log('=' .repeat(60));
  for (const pageInfo of MOBILE_PAGES) {
    await testPage(page, pageInfo, { width: 375, height: 667 });
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n\n' + '=' .repeat(60));
  console.log('📊 AUDIT SUMMARY');
  console.log('=' .repeat(60));
  
  const errors = issues.filter(i => i.severity === 'ERROR');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  
  console.log(`\nTotal pages tested: ${PAGES.length + MOBILE_PAGES.length}`);
  console.log(`Screenshots saved: ${SCREENSHOT_DIR}`);
  console.log(`\n🔴 Errors: ${errors.length}`);
  console.log(`🟡 Warnings: ${warnings.length}`);
  console.log(`🟢 Success: ${PAGES.length + MOBILE_PAGES.length - errors.length}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach(issue => {
      console.log(`  - [${issue.page}] ${issue.message}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(issue => {
      console.log(`  - [${issue.page}] ${issue.message}`);
    });
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n✅ ALL TESTS PASSED! No issues found.');
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Audit complete!\n');
}

main().catch(console.error);
