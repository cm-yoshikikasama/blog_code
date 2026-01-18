# Development Workflow (Subagent Usage)

## Basic Policy

Select the appropriate subagent based on the situation. Not all steps are mandatory.

Key Principles:

- Flexibly choose the starting point based on user requirements
- Automatically reference artifacts (plan files, design docs, research reports) if they exist
- Consider the balance between quality and speed
- When changing file/function/class names, always search all references with Grep tool and update them all
  - Targets: code, configuration files, documents, CloudFormation templates
  - Also check resource names, variable names, constants, environment variable names, type names
- Complete all tasks created with TodoWrite before finishing work

## Common Patterns

### Pattern 1: Simple Implementation

User: "Implement a Lambda function"

Flow:

1. implementer (implementation)
2. reviewer (review)
3. unit-tester (build verification and unit tests)

### Pattern 2: Research + Implementation

User: "Implement DuckDB and Iceberg integration"

Flow:

1. docs-researcher (technical research, as needed)
2. implementer (implementation)
3. reviewer (review)
4. unit-tester (build verification and unit tests)

### Pattern 3: Implementation from Plan Mode

After user completes Plan Mode planning

Important: Always follow this order for new projects

Required Checklist During Plan Mode:

- Read this workflow.md to confirm the correct flow
- Confirm projectName (resource prefix) with user (e.g., cm-kasama-projectname)
- Select AWS architecture diagram method
- Make "Create design document" the first step in the plan file
- Clearly state "Based on workflow.md Pattern 3" in the plan file

Selection Criteria:

- Embed in Markdown, edit as text → Mermaid
- Display icons on GitHub, output as image → Diagram MCP
- Default is Mermaid if not specified

Example Instructions:

- Mermaid: "Write an architecture diagram" "Add architecture diagram to README.md"
- Diagram MCP: "Create architecture diagram as image" "Generate architecture diagram as PNG"

Flow:

1. design-doc-writer (create design document, mandatory for new projects)
2. implementer (implementation)
3. reviewer (review)
4. Direct Edit (code fixes, update documentation as needed)
5. unit-tester (build verification and unit tests)

Notes During Implementation Phase:

- Compare with this workflow.md before executing plan file
- Verify "Create design document" is the first step
- "File placement order" and "development flow" are separate concepts for existing projects

Documents to Update (only when issues are found during implementation/review):

- Project design document (design.md): reflect important implementation changes
- .claude/rules/: development policies pointed out by user ("stop using this pattern" "use pnpm")
- .claude/agents/: areas needing subagent improvements
- Follow Markdown rules (@.claude/rules/markdown.md)

No Updates Needed:

- Root README.md, CLAUDE.md

### Pattern 4: Review Only

User: "Review this code"

Flow:

1. reviewer (review)

### Pattern 5: Integration Testing

User: "Verify operation in deployed environment"

Flow:

1. integration-tester (create test case document)
2. User executes job (Step Functions, etc.)
3. integration-tester (retrieve results with read-only commands, create evidence)

Prerequisites:

- CDK stack is deployed
- Credentials obtained following MFA authentication flow in aws-operations.md

integration-tester Responsibilities:

- Create test case document (`docs/test-evidence.md`)
- Retrieve results with aws-mcp-server skill
- Data validation with Athena queries (SELECT only)
- Create Markdown evidence

Not Executed:

- Long-running job execution such as start-execution
- Reason: delegated to user due to timeout risk and permission management

Output:

- Save test cases and evidence in `(project)/docs/test-evidence.md`

## Agent Role Distribution

| Agent | Responsibility | Build Verification |
| --- | --- | --- |
| implementer | Create implementation code | None |
| reviewer | Code review | None |
| unit-tester | Create and run unit tests | Yes (pnpm run build, cdk synth) |
| integration-tester | Create test case documents, create evidence with read-only commands, Athena data validation | None (assumes deployed, long-running jobs by user) |

## File Coordination

Main agent specifies file paths when launching subagents for reference

Artifact Files:

- Plan files: `.claude/plans/*.md`
- Design documents: `(project)/docs/design.md`
- Research reports: `.tmp/research/*.md`

## Temporary File Management

- `.tmp/research/`: temporary storage during research
- Research results reflected in design documents (`(project)/docs/`) as needed
