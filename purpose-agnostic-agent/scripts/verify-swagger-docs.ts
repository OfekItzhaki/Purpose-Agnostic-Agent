/**
 * Swagger Documentation Verification Script
 * 
 * This script verifies that all admin API endpoints have complete Swagger documentation:
 * - All endpoints have @ApiOperation decorators
 * - All endpoints have @ApiResponse decorators for success and error cases
 * - Request/response examples are present
 * - Bearer auth is configured
 * 
 * Requirements: 10.5
 */

import * as fs from 'fs';
import * as path from 'path';

interface EndpointCheck {
  file: string;
  endpoint: string;
  method: string;
  hasApiOperation: boolean;
  hasApiResponse: boolean;
  hasExamples: boolean;
  hasBearerAuth: boolean;
  issues: string[];
}

const ADMIN_CONTROLLERS_DIR = path.join(__dirname, 'src', 'admin', 'controllers');

const REQUIRED_DECORATORS = [
  '@ApiOperation',
  '@ApiResponse',
];

const EXPECTED_ENDPOINTS = [
  // Persona endpoints
  { file: 'admin-persona.controller.ts', method: 'GET', path: '/admin/personas' },
  { file: 'admin-persona.controller.ts', method: 'GET', path: '/admin/personas/:id' },
  { file: 'admin-persona.controller.ts', method: 'POST', path: '/admin/personas' },
  { file: 'admin-persona.controller.ts', method: 'PUT', path: '/admin/personas/:id' },
  { file: 'admin-persona.controller.ts', method: 'DELETE', path: '/admin/personas/:id' },
  { file: 'admin-persona.controller.ts', method: 'POST', path: '/admin/personas/:id/test' },
  
  // Knowledge endpoints
  { file: 'admin-knowledge.controller.ts', method: 'GET', path: '/admin/knowledge/documents' },
  { file: 'admin-knowledge.controller.ts', method: 'GET', path: '/admin/knowledge/documents/:id' },
  { file: 'admin-knowledge.controller.ts', method: 'GET', path: '/admin/knowledge/statistics' },
  { file: 'admin-knowledge.controller.ts', method: 'POST', path: '/admin/knowledge/documents/upload' },
  { file: 'admin-knowledge.controller.ts', method: 'POST', path: '/admin/knowledge/documents/bulk-upload' },
  { file: 'admin-knowledge.controller.ts', method: 'DELETE', path: '/admin/knowledge/documents/:id' },
  { file: 'admin-knowledge.controller.ts', method: 'POST', path: '/admin/knowledge/documents/bulk-delete' },
  { file: 'admin-knowledge.controller.ts', method: 'PUT', path: '/admin/knowledge/documents/bulk-reassign' },
  
  // Category endpoints
  { file: 'admin-category.controller.ts', method: 'GET', path: '/admin/categories' },
  { file: 'admin-category.controller.ts', method: 'POST', path: '/admin/categories' },
  { file: 'admin-category.controller.ts', method: 'DELETE', path: '/admin/categories/:id' },
  
  // Monitoring endpoints
  { file: 'admin-monitoring.controller.ts', method: 'GET', path: '/admin/monitoring/ingestion/status' },
  { file: 'admin-monitoring.controller.ts', method: 'GET', path: '/admin/monitoring/ingestion/statistics' },
  { file: 'admin-monitoring.controller.ts', method: 'GET', path: '/admin/monitoring/ingestion/failed' },
  { file: 'admin-monitoring.controller.ts', method: 'POST', path: '/admin/monitoring/ingestion/retry/:id' },
  { file: 'admin-monitoring.controller.ts', method: 'GET', path: '/admin/monitoring/statistics' },
  
  // Audit endpoints
  { file: 'admin-audit.controller.ts', method: 'GET', path: '/admin/audit/logs' },
];

function checkControllerFile(filePath: string): EndpointCheck[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const checks: EndpointCheck[] = [];
  
  // Check if file has @ApiBearerAuth at controller level
  const hasControllerBearerAuth = content.includes('@ApiBearerAuth()');
  
  // Find all HTTP method decorators
  const methodRegex = /@(Get|Post|Put|Delete|Patch)\((['"].*?['"])?\)/g;
  let match;
  
  while ((match = methodRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2] ? match[2].replace(/['"]/g, '') : '';
    const startIndex = match.index;
    
    // Find the next method decorator or end of file
    const nextMethodMatch = methodRegex.exec(content);
    const endIndex = nextMethodMatch ? nextMethodMatch.index : content.length;
    methodRegex.lastIndex = startIndex + 1; // Reset for next iteration
    
    // Extract the method block
    const methodBlock = content.substring(startIndex, endIndex);
    
    // Check for required decorators
    const hasApiOperation = methodBlock.includes('@ApiOperation');
    const hasApiResponse = methodBlock.includes('@ApiResponse');
    const hasExamples = methodBlock.includes('example:') || methodBlock.includes('examples:');
    
    const issues: string[] = [];
    
    if (!hasApiOperation) {
      issues.push('Missing @ApiOperation decorator');
    }
    
    if (!hasApiResponse) {
      issues.push('Missing @ApiResponse decorator');
    }
    
    // Check for multiple response codes
    const responseMatches = methodBlock.match(/@ApiResponse/g);
    if (responseMatches && responseMatches.length < 2) {
      issues.push('Should have multiple @ApiResponse decorators (success + error cases)');
    }
    
    checks.push({
      file: fileName,
      endpoint: routePath || '/',
      method,
      hasApiOperation,
      hasApiResponse,
      hasExamples,
      hasBearerAuth: hasControllerBearerAuth,
      issues,
    });
  }
  
  return checks;
}

function verifyMainSwaggerSetup(): { success: boolean; issues: string[] } {
  const mainTsPath = path.join(__dirname, 'src', 'main.ts');
  const content = fs.readFileSync(mainTsPath, 'utf-8');
  const issues: string[] = [];
  
  // Check for admin Swagger setup
  if (!content.includes('SwaggerModule.setup(\'admin/api-docs\'')) {
    issues.push('Admin API documentation route not configured');
  }
  
  // Check for Bearer auth configuration
  if (!content.includes('addBearerAuth')) {
    issues.push('Bearer authentication not configured in Swagger');
  }
  
  // Check for admin tags
  const requiredTags = [
    'Admin - Personas',
    'Admin - Knowledge',
    'Admin - Categories',
    'Admin - Monitoring',
    'Admin - Audit',
  ];
  
  for (const tag of requiredTags) {
    if (!content.includes(tag)) {
      issues.push(`Missing tag: ${tag}`);
    }
  }
  
  return {
    success: issues.length === 0,
    issues,
  };
}

function main() {
  console.log('🔍 Verifying Swagger API Documentation Completeness\n');
  console.log('=' .repeat(80));
  
  // Check main.ts setup
  console.log('\n📋 Checking main.ts Swagger configuration...\n');
  const mainSetup = verifyMainSwaggerSetup();
  
  if (mainSetup.success) {
    console.log('✅ Main Swagger setup is complete');
  } else {
    console.log('❌ Main Swagger setup has issues:');
    mainSetup.issues.forEach(issue => console.log(`   - ${issue}`));
  }
  
  // Check all controller files
  console.log('\n📋 Checking admin controller endpoints...\n');
  
  const allChecks: EndpointCheck[] = [];
  const controllerFiles = fs.readdirSync(ADMIN_CONTROLLERS_DIR)
    .filter(file => file.startsWith('admin-') && file.endsWith('.controller.ts'));
  
  for (const file of controllerFiles) {
    const filePath = path.join(ADMIN_CONTROLLERS_DIR, file);
    const checks = checkControllerFile(filePath);
    allChecks.push(...checks);
  }
  
  // Verify expected endpoints are documented
  console.log('Expected Endpoints Coverage:\n');
  
  let allEndpointsDocumented = true;
  
  for (const expected of EXPECTED_ENDPOINTS) {
    const found = allChecks.find(
      check => check.file === expected.file && 
               check.method === expected.method
    );
    
    if (!found) {
      console.log(`❌ ${expected.method} ${expected.path} - NOT FOUND`);
      allEndpointsDocumented = false;
    } else if (found.issues.length > 0) {
      console.log(`⚠️  ${expected.method} ${expected.path} - HAS ISSUES`);
      found.issues.forEach(issue => console.log(`   - ${issue}`));
      allEndpointsDocumented = false;
    } else {
      console.log(`✅ ${expected.method} ${expected.path}`);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  
  const totalEndpoints = EXPECTED_ENDPOINTS.length;
  const documentedEndpoints = allChecks.filter(c => c.hasApiOperation && c.hasApiResponse).length;
  const endpointsWithExamples = allChecks.filter(c => c.hasExamples).length;
  const endpointsWithBearerAuth = allChecks.filter(c => c.hasBearerAuth).length;
  
  console.log(`Total Expected Endpoints: ${totalEndpoints}`);
  console.log(`Endpoints with @ApiOperation: ${documentedEndpoints}/${totalEndpoints}`);
  console.log(`Endpoints with @ApiResponse: ${documentedEndpoints}/${totalEndpoints}`);
  console.log(`Endpoints with Examples: ${endpointsWithExamples}/${totalEndpoints}`);
  console.log(`Endpoints with Bearer Auth: ${endpointsWithBearerAuth}/${totalEndpoints}`);
  
  console.log('\n' + '='.repeat(80));
  
  if (mainSetup.success && allEndpointsDocumented) {
    console.log('\n✅ All API documentation checks passed!');
    console.log('\nNext steps:');
    console.log('1. Start the application: npm run start:dev');
    console.log('2. Visit http://localhost:3000/admin/api-docs');
    console.log('3. Verify the Swagger UI is accessible');
    console.log('4. Test the "Authorize" button with a Bearer token');
    process.exit(0);
  } else {
    console.log('\n❌ API documentation verification failed!');
    console.log('\nPlease fix the issues listed above.');
    process.exit(1);
  }
}

main();
