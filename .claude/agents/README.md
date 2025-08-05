# Urban Flower Farm - Claude Code Subagents

This directory contains specialized AI subagents that help with specific aspects of the Urban Flower Farm e-commerce application development.

## Available Subagents

### 🔥 firebase-specialist
**Purpose**: Firebase operations expert  
**Expertise**: Database rules, authentication, cloud functions, real-time data  
**Use for**: Security rules, data structure optimization, authentication flows, Firebase configuration

### ⚛️ react-component-dev
**Purpose**: React component development  
**Expertise**: Component creation, state management, performance optimization  
**Use for**: Building new UI components, refactoring components, implementing hooks

### 🛒 order-system-specialist
**Purpose**: E-commerce order management  
**Expertise**: Cart, checkout, order processing, admin features  
**Use for**: Order flow improvements, discount logic, invoice generation, order tracking

### 🚀 deployment-manager
**Purpose**: Build and deployment operations  
**Expertise**: Git workflows, Firebase hosting, environment management  
**Use for**: Deployments, branch management, build optimization, CI/CD

### 📧 email-template-designer
**Purpose**: Email template creation and optimization  
**Expertise**: HTML emails, cross-client compatibility, responsive design  
**Use for**: Order confirmations, invoices, email template updates

### 🐛 bug-hunter
**Purpose**: Debugging and issue resolution  
**Expertise**: Error investigation, root cause analysis, performance issues  
**Use for**: Bug fixes, error tracking, performance optimization, console warnings

### 🎨 ui-ux-specialist
**Purpose**: User interface and experience design  
**Expertise**: Visual design, accessibility, responsive layouts, animations  
**Use for**: UI improvements, mobile optimization, accessibility fixes, user flow enhancements

## How Subagents Work

1. **Automatic Invocation**: Claude Code will automatically use the appropriate subagent based on your request
2. **Explicit Request**: You can specifically request a subagent: "Use the firebase-specialist to optimize my database queries"
3. **Isolated Context**: Each subagent operates in its own context to maintain focus
4. **Specialized Knowledge**: Each agent has deep knowledge of Urban Flower Farm's specific patterns and requirements

## Examples

```
// Automatic invocation
"Fix the order confirmation email template"
→ email-template-designer will handle this

"Debug why orders aren't saving"  
→ bug-hunter + firebase-specialist will collaborate

"Deploy to staging"
→ deployment-manager will handle the deployment

// Explicit invocation
"Use the ui-ux-specialist to improve mobile checkout flow"
"Have the bug-hunter investigate console warnings"
```

## Project-Specific Knowledge

All agents understand:
- Urban Flower Farm's tech stack (React, Firebase, SendGrid)
- Project structure and conventions
- Common issues and their solutions
- Deployment environments (staging, production)
- Business logic (orders, inventory, discounts)

## Creating New Agents

To create a new subagent:

1. Create a new `.md` file in this directory
2. Add YAML frontmatter with name, description, and tools
3. Write a detailed system prompt
4. Focus on a specific domain

Example:
```markdown
---
name: your-agent-name
description: What this agent does and when to use it
tools: Read, Edit, Bash  # Optional - inherits all if omitted
---

Your detailed system prompt here...
```

## Best Practices

1. Use agents for complex, domain-specific tasks
2. Let agents handle their expertise areas
3. Combine agents for multi-faceted problems
4. Trust the automatic agent selection
5. Review agent suggestions before major changes

---

These agents significantly speed up development by providing specialized expertise exactly when needed!