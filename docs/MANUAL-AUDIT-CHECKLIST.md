# Manual Audit Checklist for Immivo Public Pages

Since automated browser testing isn't available, use this checklist to manually audit each page.

---

## 🎯 What to Check

For each page, verify:
1. ✅ Visual consistency (white/black/blue color scheme)
2. ✅ Animations working (elements fade in on scroll)
3. ✅ Mobile responsiveness (no horizontal scroll, readable text)
4. ✅ No broken layouts or visual issues

---

## 📄 Pages to Test

### Desktop (1440px width)

#### 1. `/preise` (Pricing Page)
- [ ] Hero section animates in
- [ ] Pricing cards stagger in (4 cards)
- [ ] Monthly/Yearly toggle works
- [ ] FAQ accordion works
- [ ] Colors: White background, gray-900 for Team card
- [ ] No horizontal scroll
- [ ] All text readable

**Expected animations:**
- Hero fades up (0.6s)
- Cards stagger with 100ms delay each
- FAQ section fades up

**Issues found:**
```
(Write any issues here)
```

---

#### 2. `/ueber-uns` (About Us Page)
- [ ] Hero section (dark background) animates in
- [ ] Story section slides in from left/right
- [ ] Founder cards stagger in (Josef first, Dennis second)
- [ ] Values cards stagger in (4 cards)
- [ ] CTA section fades in
- [ ] Colors: Gray-900 hero, white sections, gray-50 founders section
- [ ] No horizontal scroll

**Expected animations:**
- Hero fades up (0.7s)
- Story text slides from left
- Story card slides from right
- Founder cards: 0ms and 150ms delay
- Value cards: 0ms, 100ms, 200ms, 300ms delay

**Issues found:**
```
(Write any issues here)
```

---

#### 3. `/kontakt` (Contact Page)
- [ ] Hero section animates in
- [ ] Contact info slides from left
- [ ] Contact form slides from right
- [ ] Demo section fades in (100ms delay)
- [ ] Direct contact section fades in (200ms delay)
- [ ] Form submission works
- [ ] Colors: White background, blue-50 for demo box
- [ ] No horizontal scroll

**Expected animations:**
- Hero fades up (0.7s)
- Contact info slides from left (-30px)
- Form slides from right (30px)
- Nested sections have stagger delays

**Issues found:**
```
(Write any issues here)
```

---

#### 4. `/karriere` (Careers Page)
- [ ] Hero section animates in
- [ ] Benefits cards stagger in (4 cards)
- [ ] Job listings fade in
- [ ] Job cards stagger if multiple jobs
- [ ] CTA section fades in
- [ ] Application modal opens/closes
- [ ] Colors: White background, gray-50 for job section
- [ ] No horizontal scroll

**Expected animations:**
- Hero fades up (0.7s)
- Benefits: 0ms, 100ms, 200ms, 300ms delay
- Jobs section fades up
- Individual jobs: 100ms delay each

**Issues found:**
```
(Write any issues here)
```

---

#### 5. `/blog` (Blog Page)
- [ ] Page loads without errors
- [ ] Layout consistent with other pages
- [ ] Colors match site theme
- [ ] No horizontal scroll

**Issues found:**
```
(Write any issues here)
```

---

#### 6. `/impressum` (Imprint Page)
- [ ] Page loads without errors
- [ ] Content is readable
- [ ] Colors match site theme
- [ ] No horizontal scroll

**Issues found:**
```
(Write any issues here)
```

---

#### 7. `/datenschutz` (Privacy Policy Page)
- [ ] Page loads without errors
- [ ] Content is readable
- [ ] Colors match site theme
- [ ] No horizontal scroll

**Issues found:**
```
(Write any issues here)
```

---

#### 8. `/agb` (Terms & Conditions Page)
- [ ] Page loads without errors
- [ ] Content is readable
- [ ] Colors match site theme
- [ ] No horizontal scroll

**Issues found:**
```
(Write any issues here)
```

---

### Mobile (375px width)

#### 9. `/preise` (Mobile)
- [ ] Hero text is readable
- [ ] Pricing cards stack vertically
- [ ] Toggle is accessible
- [ ] FAQ is readable
- [ ] No horizontal scroll
- [ ] Buttons are tappable (min 44px height)
- [ ] Text doesn't overflow

**Issues found:**
```
(Write any issues here)
```

---

#### 10. `/kontakt` (Mobile)
- [ ] Hero text is readable
- [ ] Contact info stacks vertically
- [ ] Form fields are full width
- [ ] All sections readable
- [ ] No horizontal scroll
- [ ] Buttons are tappable
- [ ] Form is usable

**Issues found:**
```
(Write any issues here)
```

---

## 🔍 Common Issues to Watch For

### Animation Issues
- ❌ Elements stuck at `opacity: 0` (not visible)
- ❌ Animations trigger too late (after scrolling past)
- ❌ Animations trigger too early (before element is visible)
- ❌ Stagger delays too long (feels slow)
- ❌ Stagger delays too short (feels instant)

### Layout Issues
- ❌ Horizontal scroll on mobile
- ❌ Text overflow (cut off)
- ❌ Overlapping elements
- ❌ Navigation covering content
- ❌ Footer not at bottom
- ❌ Buttons too small to tap (mobile)

### Color Issues
- ❌ Wrong background color (not white/gray-50/gray-900)
- ❌ Wrong text color (not gray-900/gray-600/white)
- ❌ Wrong accent color (not blue-600)
- ❌ Low contrast (hard to read)

### Responsive Issues
- ❌ Text too small on mobile
- ❌ Images not responsive
- ❌ Cards don't stack properly
- ❌ Padding too small on mobile
- ❌ Buttons not full width on mobile

---

## 📊 Testing Process

### For Each Page:

1. **Open the page** in your browser
2. **Check initial load**
   - Does the hero section appear?
   - Are there any console errors? (F12 → Console)
3. **Scroll down slowly**
   - Do elements fade in as you scroll?
   - Are animations smooth?
   - Is the timing natural?
4. **Scroll to bottom**
   - Is the footer visible?
   - Are all sections rendered?
5. **Check mobile** (if applicable)
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Set to iPhone SE (375px)
   - Repeat steps 1-4

---

## ✅ Expected Results

### All Pages Should Have:
- ✅ White or gray-50 background
- ✅ Gray-900 text for headings
- ✅ Gray-600 text for body
- ✅ Blue-600 for links and accents
- ✅ Smooth fade-in animations (0.6-0.7s)
- ✅ Stagger delays on card grids (100-150ms)
- ✅ No horizontal scroll
- ✅ Readable text on mobile
- ✅ Tappable buttons (min 44px height)

### Animation Timing:
- **Hero**: 0.6-0.7s fade up
- **Cards**: 100-150ms stagger between each
- **Sections**: 0.7s fade up
- **Nested elements**: Additional 100-200ms delay

---

## 🐛 How to Report Issues

For each issue found, note:
1. **Page**: Which page (/preise, /kontakt, etc.)
2. **Severity**: ERROR (broken) or WARNING (minor)
3. **Description**: What's wrong?
4. **Steps to reproduce**: How to see the issue
5. **Screenshot**: If possible

Example:
```
Page: /preise
Severity: ERROR
Description: Pricing cards not visible on mobile
Steps: Open /preise on 375px width, cards are hidden
Screenshot: preise-mobile-cards-hidden.png
```

---

## 🎯 Quick Test (5 minutes)

If you're short on time, test these critical paths:

1. **Desktop `/preise`**
   - Hero loads ✓
   - Cards animate in ✓
   - Toggle works ✓

2. **Mobile `/preise`**
   - No horizontal scroll ✓
   - Cards stack vertically ✓
   - Text is readable ✓

3. **Desktop `/kontakt`**
   - Form loads ✓
   - Animations work ✓
   - Can submit form ✓

If these 3 tests pass, the rest are likely fine.

---

## 📝 Notes Section

Use this space for general observations:

```
(Your notes here)
```

---

## ✨ Completion

- [ ] All desktop pages tested
- [ ] All mobile pages tested
- [ ] Issues documented
- [ ] Screenshots taken (if needed)
- [ ] Ready to report findings

---

**Tester**: _______________  
**Date**: _______________  
**Browser**: _______________  
**OS**: _______________
