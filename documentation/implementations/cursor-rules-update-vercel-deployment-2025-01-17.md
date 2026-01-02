# Cursor Rules Update - Vercel Deployment Best Practices

## Date: 2025-01-17
**Project**: Terms and Conditions Update - Membership Checkout Page  
**Purpose**: Update cursor rules with Vercel deployment troubleshooting and monorepo configuration best practices

## New Rules to Add to Cursor Rules

### Vercel Deployment & Monorepo Configuration

#### 1. **Monorepo Vercel Configuration Best Practices**
```json
{
  "version": 2,
  "buildCommand": "npm install && cd apps/web && npm run build",
  "devCommand": "npm run dev:web",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

**Key Points**:
- **ALWAYS** use `npm install` at root level for monorepo dependency resolution
- **ALWAYS** specify the correct subdirectory path (`cd apps/web`) in build command
- **ALWAYS** set explicit `outputDirectory` to prevent path confusion
- **NEVER** rely on workspace scripts for Vercel builds

#### 2. **Vercel Configuration Conflict Resolution**
- **ALWAYS** check for conflicting `.vercel` directories in subdirectories
- **ALWAYS** remove duplicate Vercel configurations to prevent build conflicts
- **ALWAYS** maintain only one Vercel configuration at the root level
- **NEVER** have multiple `.vercel` directories in a monorepo

#### 3. **Troubleshooting Vercel Build Issues**
When encountering `routes-manifest.json` errors:
1. **FIRST**: Check for conflicting Vercel configurations
2. **SECOND**: Verify monorepo build paths are correct
3. **THIRD**: Ensure output directory is explicitly specified
4. **FOURTH**: Test local builds to isolate environment-specific issues
5. **FIFTH**: Use `vercel --force` to clear cached configurations

#### 4. **Monorepo Build Path Validation**
- **ALWAYS** verify the build command points to the correct subdirectory
- **ALWAYS** test that `cd apps/web && npm run build` works locally
- **ALWAYS** ensure the output directory matches the actual build location
- **NEVER** assume workspace scripts will work in Vercel environment

#### 5. **Vercel Deployment Troubleshooting Checklist**
```
□ Check for conflicting .vercel directories
□ Verify buildCommand uses correct subdirectory path
□ Confirm outputDirectory is explicitly set
□ Test local build process
□ Clear Vercel cache with --force flag
□ Update vercel.json configuration
□ Commit and push configuration changes
□ Monitor build logs for specific error details
```

## Updated Authentication & Authorization Patterns

### **Vercel-Specific Authentication Considerations**
- **ALWAYS** test authentication in production after Vercel deployment
- **ALWAYS** verify environment variables are properly set in Vercel
- **ALWAYS** check that authentication flows work in production environment
- **NEVER** assume local authentication testing covers production scenarios

## Updated Error Handling Patterns

### **Vercel Deployment Error Handling**
```typescript
// When encountering Vercel deployment issues:
try {
  // 1. Check build configuration
  // 2. Verify monorepo paths
  // 3. Clear conflicting configurations
  // 4. Update vercel.json
  // 5. Force redeploy
} catch (vercelError) {
  // Log specific error details
  // Check Vercel build logs
  // Verify configuration changes
  // Test local builds
}
```

## Updated Testing Patterns

### **Pre-Deployment Testing Checklist**
- **ALWAYS** test local builds before Vercel deployment
- **ALWAYS** verify all linting errors are resolved
- **ALWAYS** test component functionality locally
- **ALWAYS** check that build artifacts are generated correctly
- **NEVER** deploy without resolving local build issues

### **Post-Deployment Validation**
- **ALWAYS** verify deployment success in Vercel dashboard
- **ALWAYS** test functionality in production environment
- **ALWAYS** check that all features work as expected
- **ALWAYS** monitor for any production-specific issues

## Updated Documentation Patterns

### **Vercel Configuration Documentation**
```markdown
## Vercel Configuration
- **Build Command**: `npm install && cd apps/web && npm run build`
- **Output Directory**: `apps/web/.next`
- **Framework**: Next.js
- **Install Command**: `npm install` (root level)

## Troubleshooting Notes
- Remove conflicting .vercel directories
- Use explicit output directory specification
- Test local builds before deployment
- Monitor Vercel build logs for errors
```

## Updated Deployment Patterns

### **Vercel Deployment Workflow**
1. **Prepare**: Resolve all linting errors and local build issues
2. **Configure**: Update vercel.json with correct monorepo settings
3. **Test**: Verify local builds work correctly
4. **Commit**: Push all changes including configuration updates
5. **Deploy**: Use `vercel --prod` with updated configuration
6. **Validate**: Test functionality in production environment
7. **Document**: Record any issues and solutions for future reference

## Key Learnings Summary

### **What We Learned**
1. **Conflicting Vercel configurations** can cause persistent build issues
2. **Monorepo builds** require careful attention to build paths and output directories
3. **The `routes-manifest.json` error** is often a configuration issue, not a code issue
4. **Local builds working** doesn't guarantee Vercel builds will work
5. **Explicit output directory specification** can resolve path-related build issues

### **What We Fixed**
1. **Removed duplicate Vercel configurations** from subdirectories
2. **Updated build commands** to use explicit subdirectory paths
3. **Added output directory specification** to prevent path confusion
4. **Cleared Vercel cache** to ensure new configuration is used
5. **Tested deployment** with updated configuration

## Integration with Existing Rules

### **Updated Authentication Rules**
- Add Vercel-specific authentication testing requirements
- Include production environment validation steps
- Emphasize environment variable verification

### **Updated Testing Rules**
- Include Vercel deployment testing requirements
- Add monorepo build validation steps
- Emphasize local vs. production testing differences

### **Updated Documentation Rules**
- Include Vercel configuration documentation
- Add troubleshooting guides for common deployment issues
- Emphasize configuration change documentation

## Conclusion

This update to the cursor rules provides comprehensive guidance for handling Vercel deployments in monorepo environments. The key learnings from the terms and conditions project have been codified into actionable rules that will prevent similar issues in future projects.

**Next Steps**: 
1. Integrate these rules into the main cursor rules file
2. Update team documentation with Vercel best practices
3. Use these patterns for all future Vercel deployments
4. Monitor and update rules based on new learnings

---

*Rules update completed on 2025-01-17 based on Terms and Conditions project learnings*
