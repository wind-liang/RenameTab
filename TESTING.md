# Tab Renamer Testing Guide

This document provides step-by-step instructions for testing the Tab Renamer extension to ensure all requirements are met.

## Test Preparation

1. Load the extension in Chrome/Edge by going to `chrome://extensions/`, enabling Developer mode, and clicking "Load unpacked" to select the extension directory.

## Test Cases

### Basic Functionality

1. **Domain Rule Test**
   - Navigate to `https://www.example.com`
   - Open the extension
   - Select "By Domain" option
   - Verify pattern is auto-filled with `www.example.com`
   - Enter "Example Website" as the title
   - Click "Save Rule"
   - Verify the tab title changes to "Example Website"
   - Refresh the page and verify the title remains "Example Website"

2. **Domain + Path Rule Test**
   - Navigate to `https://www.example.com/about`
   - Open the extension
   - Select "By Domain + Path" option
   - Verify pattern is auto-filled with `www.example.com/about`
   - Enter "Example About Page" as the title
   - Click "Save Rule"
   - Verify the tab title changes to "Example About Page"
   - Navigate to `https://www.example.com` and verify title is "Example Website" (from previous rule)
   - Navigate back to `https://www.example.com/about` and verify title is "Example About Page"

3. **Domain + Path + Parameters Rule Test**
   - Navigate to `https://www.example.com/search?q=test&page=1`
   - Open the extension
   - Select "By Domain + Path + Parameters" option
   - Verify pattern is auto-filled with `www.example.com/search`
   - Verify parameters section shows:
     - q: test
     - page: 1
   - Enter "Test Search Results" as the title
   - Click "Save Rule"
   - Verify the tab title changes to "Test Search Results"
   - Navigate to `https://www.example.com/search?q=other&page=1` and verify title does NOT change
   - Navigate back to `https://www.example.com/search?q=test&page=1` and verify title is "Test Search Results"

### Advanced Functionality

4. **Regex Parameter Test**
   - Navigate to `https://www.example.com/product?id=12345`
   - Open the extension
   - Select "By Domain + Path + Parameters" option
   - In the parameter section for "id", check the "Regex" checkbox
   - Change the parameter value to `\d+` (regex for any number)
   - Enter "Product Page" as the title
   - Click "Save Rule"
   - Verify the tab title changes to "Product Page"
   - Navigate to `https://www.example.com/product?id=67890` and verify title changes to "Product Page"
   - Navigate to `https://www.example.com/product?id=abc` and verify title does NOT change
   - Refresh the page with `id=67890` and verify the title is still "Product Page"

5. **Hash Parameter Test**
   - Navigate to `https://www.example.com/app#section=dashboard&user=john`
   - Open the extension
   - Select "By Domain + Path + Parameters" option
   - Verify hash parameters are shown with "#" prefix
   - Enter "John's Dashboard" as the title
   - Click "Save Rule"
   - Verify the tab title changes to "John's Dashboard"
   - Navigate to `https://www.example.com/app#section=settings&user=john` and verify title does NOT change
   - Navigate back to `https://www.example.com/app#section=dashboard&user=john` and verify title is "John's Dashboard"

### Rule Management

6. **Rule Display Test**
   - After creating the above rules, open the extension on any page
   - Verify all created rules are displayed in the rules list
   - Navigate to a page with a matching rule
   - Open the extension
   - Verify the matching rule is highlighted

7. **Rule Deletion Test**
   - Navigate to a page with an applied rule
   - Open the extension
   - Find the matching rule in the list
   - Click the delete button (×)
   - Verify the rule disappears from the list
   - Verify the page title reverts to its original title

## Bug Testing

8. **Title Persistence in Single Page Applications**
   - Find a single page application (like Gmail or a React/Vue demo)
   - Create a rule for a specific route/state
   - Navigate around the SPA and verify the title remains consistent when on matching routes

9. **Edge Cases**
   - Test with very long URLs
   - Test with URLs containing special characters
   - Test with empty parameter values
   - Test with websites that rapidly change their titles (YouTube, etc.)

## Localization Test

10. **Non-ASCII Titles**
    - Create rules with non-ASCII titles (e.g., Chinese, Arabic, emoji)
    - Verify the titles display correctly

## Final Verification

Ensure all requirements from the original specification are met:
- Three types of rule matching (domain, path, parameters)
- Auto-filling of URL based on rule type
- Parameter parsing including hash parameters
- Regex support for parameter values
- Immediate title change on match
- Title persistence across refreshes
- Display of matching rules for easy deletion 