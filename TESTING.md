# Testing Documentation - Jirung Senior Advisor

This document outlines the comprehensive testing strategy implemented for the Jirung Senior Advisor application as part of Task 15: End-to-End Testing and Quality Assurance.

## Overview

The testing suite covers all critical aspects of the application:
- Complete user journeys
- Thai language input and response accuracy
- PII scrubbing effectiveness with real-world data patterns
- LINE integration and handoff scenarios
- Security testing and content safety verification

## Test Categories

### 1. User Journey Tests (`e2e/user-journey.spec.ts`)

**Purpose**: Validate complete user workflows and core functionality

**Test Cases**:
- Basic chat interaction in Thai
- Multiple conversation turns
- LINE handoff for complex queries
- Empty and invalid input handling
- Mobile responsiveness
- Session management across page interactions

**Requirements Covered**: 1.1, 1.2, 1.3, 1.4

### 2. Thai Language Tests (`e2e/thai-language.spec.ts`)

**Purpose**: Ensure proper Thai language support and culturally appropriate responses

**Test Cases**:
- Various Thai input methods and characters
- Common elder care questions in Thai
- Special characters and formatting
- Cultural context and appropriateness
- Regional dialects and informal language
- Language consistency in responses
- Mixed Thai-English input

**Requirements Covered**: 1.1, 1.2, 1.4

### 3. PII Security Tests (`e2e/pii-security.spec.ts`)

**Purpose**: Verify PII scrubbing and basic security measures

**Test Cases**:
- Thai phone number scrubbing
- Email address masking
- Thai ID number protection
- URL removal
- LINE ID masking
- Multiple PII types in single message
- XSS attack prevention
- SQL injection handling
- Rate limiting
- Content length validation

**Requirements Covered**: 4.2, 8.2, 8.3

### 4. Real-World PII Tests (`e2e/real-world-pii.spec.ts`)

**Purpose**: Test PII scrubbing with realistic, complex scenarios

**Test Cases**:
- Realistic Thai personal information patterns
- Complex mixed PII scenarios
- Preservation of legitimate medical information
- Edge cases in PII detection
- Thai context and language patterns
- Conversation quality after PII scrubbing

**Requirements Covered**: 4.2, 8.2

### 5. LINE Integration Tests (`e2e/line-integration.spec.ts`)

**Purpose**: Validate LINE handoff functionality and scenarios

**Test Cases**:
- LINE button for emergency queries
- Complex care scenario handoffs
- LINE button click tracking
- Different conversation contexts
- Appropriate handoff messaging
- Service unavailability handling
- Conversation flow maintenance
- Multiple LINE interactions

**Requirements Covered**: 3.1, 3.2, 3.3, 4.4

### 6. Content Safety Tests (`e2e/content-safety.spec.ts`)

**Purpose**: Ensure medical compliance and content safety

**Test Cases**:
- No medical diagnoses provided
- No specific medication recommendations
- Appropriate emergency situation handling
- Safe home care advice provision
- Appropriate tone and empathy
- Inappropriate content handling
- Consistent safety disclaimers
- Cultural sensitivity
- Response quality under various inputs

**Requirements Covered**: 2.1, 2.2, 2.3, 2.5, 2.6

### 7. Accessibility & Performance Tests (`e2e/accessibility-performance.spec.ts`)

**Purpose**: Verify accessibility compliance and performance standards

**Test Cases**:
- Basic accessibility requirements
- Keyboard-only navigation
- Color contrast compliance
- Screen reader support
- High contrast mode
- Responsive design across screen sizes
- Performance metrics
- Multiple rapid interactions
- Thai font rendering
- Focus management
- Error feedback

**Requirements Covered**: 5.3, 5.4, 8.4

## Running Tests

### Prerequisites

1. **Environment Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Install Playwright browsers
   npx playwright install
   ```

2. **Environment Variables**:
   - Copy `.env.example` to `.env.local`
   - Configure required environment variables (GEMINI_API_KEY, etc.)

3. **Application Build**:
   ```bash
   npm run build
   ```

### Test Execution

#### Run All Tests (Recommended)
```bash
npm run test:qa
```

This runs the comprehensive QA test suite including:
- Unit tests
- All E2E test categories
- Generates detailed report

#### Run Individual Test Categories
```bash
# All E2E tests
npm run test:e2e

# Specific test file
npx playwright test e2e/user-journey.spec.ts

# With UI mode
npm run test:e2e:ui

# With headed browser (visible)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

#### Run Unit Tests Only
```bash
npm run test:run
```

### Test Configuration

#### Playwright Configuration (`playwright.config.ts`)
- **Browsers**: Chromium, Firefox, WebKit
- **Mobile Testing**: Pixel 5, iPhone 12
- **Base URL**: http://localhost:3000
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 30 seconds per test
- **Trace**: On first retry

#### Test Environment
- **Development Server**: Automatically started before tests
- **Test Data**: Uses mock data and environment variables
- **Network Mocking**: For external services (LINE, Gemini API)

## Test Data and Scenarios

### Thai Language Test Data
- Common elder care questions
- Cultural context scenarios
- Regional dialect variations
- Mixed language inputs

### PII Test Patterns
- Thai phone numbers: `081-234-5678`, `0812345678`
- Email addresses: `user@domain.com`, `user.name@domain.co.th`
- Thai ID numbers: `1234567890123`, `1-2345-67890-12-3`
- LINE IDs: `@doctor123`, `@nurse_thai`
- URLs: `https://hospital.co.th`, `www.clinic.com`

### Emergency Scenarios
- Loss of consciousness: `ผู้สูงอายุหมดสติ`
- Breathing difficulties: `หายใจไม่ออก`
- Chest pain: `เจ็บหน้าอก`
- Falls: `ล้มแล้วลุกไม่ขึ้น`

### Content Safety Test Cases
- Medical diagnosis requests
- Medication recommendations
- Emergency situations
- Inappropriate content
- Cultural sensitivity scenarios

## Expected Results

### Success Criteria
- **Pass Rate**: 100% for critical user journeys
- **PII Protection**: 100% scrubbing effectiveness
- **Response Time**: < 10 seconds for AI responses
- **Accessibility**: WCAG 2.1 AA compliance
- **Mobile Support**: Full functionality on mobile devices
- **Thai Language**: Proper rendering and input support

### Performance Benchmarks
- **Page Load**: < 5 seconds
- **First Contentful Paint**: < 3 seconds
- **Time to Interactive**: < 5 seconds
- **AI Response**: < 10 seconds

### Security Requirements
- No PII in displayed messages
- XSS attack prevention
- SQL injection protection
- Rate limiting effectiveness
- Input validation and sanitization

## Troubleshooting

### Common Issues

1. **Playwright Browser Installation**:
   ```bash
   npx playwright install --with-deps
   ```

2. **Environment Variables Missing**:
   - Ensure `.env.local` exists with required variables
   - Check GEMINI_API_KEY is valid

3. **Port Conflicts**:
   - Ensure port 3000 is available
   - Kill existing Next.js processes

4. **Test Timeouts**:
   - Check network connectivity
   - Verify Gemini API accessibility
   - Increase timeout in playwright.config.ts if needed

### Debug Mode
```bash
# Run specific test in debug mode
npx playwright test e2e/user-journey.spec.ts --debug

# Run with headed browser
npx playwright test --headed

# Generate trace
npx playwright test --trace on
```

### CI/CD Integration

The test suite is designed for CI/CD integration:
- **Exit Codes**: 0 for success, 1 for failure
- **Parallel Execution**: Supports parallel test runs
- **Retry Logic**: Automatic retries on CI environments
- **Reporting**: HTML reports generated in `playwright-report/`

## Maintenance

### Adding New Tests
1. Create test file in `e2e/` directory
2. Follow existing naming convention: `feature-name.spec.ts`
3. Update `scripts/run-qa-tests.js` to include new test category
4. Document test cases in this file

### Updating Test Data
- Review and update PII patterns as needed
- Add new Thai language scenarios
- Update emergency keywords and responses
- Refresh cultural context examples

### Performance Monitoring
- Monitor test execution times
- Update performance benchmarks
- Review and optimize slow tests
- Maintain browser compatibility

## Compliance and Requirements

This testing suite ensures compliance with:
- **Task 15 Requirements**: Complete E2E testing and QA
- **WCAG 2.1 AA**: Accessibility standards
- **Thai Language Support**: Proper localization
- **PII Protection**: Data privacy requirements
- **Medical Safety**: Healthcare application standards
- **Cultural Sensitivity**: Thai cultural appropriateness

## Reporting

Test results are available in multiple formats:
- **Console Output**: Real-time test execution status
- **HTML Report**: Detailed results in `playwright-report/`
- **JSON Report**: Machine-readable results
- **Screenshots**: Failure screenshots automatically captured
- **Videos**: Test execution recordings on failure

For questions or issues with the testing suite, refer to the project documentation or contact the development team.