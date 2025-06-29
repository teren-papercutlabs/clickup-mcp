# ClickUp MCP Server

MCP server for ClickUp task management integration, providing comprehensive task operations, search capabilities, and workspace management.

## Features

- **Task Management**: Create, read, update, and delete tasks
- **Search**: Flexible search with scope control (workspace/space/folder/list)
- **Comments**: Add and list task comments
- **Dependencies**: Manage task dependencies and relationships
- **Workspace Discovery**: Navigate workspace hierarchy

## Installation

### From npm

```bash
npm install -g @mcp-servers/clickup
```

### From source

```bash
git clone <repository>
cd mcp-servers/clickup
npm install
npm run build
```

## Configuration

### Getting your ClickUp API Token

1. Log into ClickUp
2. Navigate to Settings → Apps
3. Under API Token, click "Generate" or copy existing token
4. Save your personal API token

### Environment Setup

Set the `CLICKUP_API_TOKEN` environment variable:

```bash
export CLICKUP_API_TOKEN="pk_YOUR_TOKEN_HERE"
```

### MCP Configuration

Add to your MCP settings file (`.mcp.json` or equivalent):

```json
{
  "servers": {
    "clickup": {
      "command": "mcp-server-clickup",
      "env": {
        "CLICKUP_API_TOKEN": "pk_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

## Usage

### Core Task Operations

#### Create Task
```typescript
clickup_create_task({
  list_id: "901234567",
  name: "Implement new feature",
  markdown_description: "## Description\n- Feature details\n- Implementation notes",
  priority: 2, // High
  tags: ["feature", "backend"],
  assignees: [123456] // User IDs
})
```

#### Get Task Details
```typescript
clickup_get_task({
  task_id: "abc123"
})
```

#### Update Task
```typescript
clickup_update_task({
  task_id: "abc123",
  status: "in progress",
  priority: 1, // Urgent
  assignees_add: [789012],
  tags_add: ["urgent"]
})
```

#### List Tasks
```typescript
clickup_list_tasks({
  list_id: "901234567",
  page: 0,
  include_closed: false,
  statuses: ["open", "in progress"]
})
```

### Search Operations

#### Search with Scope Control
```typescript
// Search in specific list (fastest)
clickup_search_tasks({
  query: "bug",
  scope: "list",
  list_id: "901234567",
  team_id: "123456"
})

// Search entire workspace (broadest)
clickup_search_tasks({
  query: "overdue",
  scope: "workspace",
  team_id: "123456",
  due_date_lt: Date.now()
})
```

### Comments

#### Add Comment
```typescript
clickup_add_comment({
  task_id: "abc123",
  comment_text: "Started working on this. ETA 2 hours.",
  notify_all: true
})
```

#### List Comments
```typescript
clickup_list_comments({
  task_id: "abc123"
})
```

### Dependencies

#### Add Dependency
```typescript
// Task A waits for Task B
clickup_add_dependency({
  task_id: "taskA",
  depends_on: "taskB"
})

// Task C blocks Task D
clickup_add_dependency({
  task_id: "taskC",
  dependency_of: "taskD"
})
```

#### View Dependencies
```typescript
clickup_list_dependencies({
  task_id: "abc123"
})
```

### Workspace Discovery

#### Get Full Workspace Structure
```typescript
clickup_get_workspace_structure()
// Returns hierarchy: Teams → Spaces → Lists
```

## Tool Reference

### Task Tools

| Tool | Description |
|------|-------------|
| `clickup_create_task` | Create a new task with full configuration |
| `clickup_get_task` | Get detailed task information |
| `clickup_update_task` | Update task properties (partial updates) |
| `clickup_delete_task` | Permanently delete a task |
| `clickup_list_tasks` | List tasks from a specific list with filters |

### Search Tools

| Tool | Description |
|------|-------------|
| `clickup_search_tasks` | Search with flexible scope (workspace/space/folder/list) |

### Comment Tools

| Tool | Description |
|------|-------------|
| `clickup_add_comment` | Add a comment to a task |
| `clickup_list_comments` | Get all comments for a task |

### Dependency Tools

| Tool | Description |
|------|-------------|
| `clickup_add_dependency` | Create task dependency relationship |
| `clickup_remove_dependency` | Remove task dependency |
| `clickup_list_dependencies` | View all dependencies for a task |

### Workspace Tools

| Tool | Description |
|------|-------------|
| `clickup_get_workspace_structure` | Discover workspace hierarchy |

## Best Practices

### Performance

1. **Use narrow search scopes**: List search is 10x faster than workspace search
2. **Implement pagination**: Use page parameter for large result sets
3. **Cache workspace structure**: It rarely changes

### Task Creation

1. Always specify `list_id` - tasks must belong to a list
2. Use `markdown_description` for rich formatting
3. Set meaningful priorities (1=Urgent, 2=High, 3=Normal, 4=Low)
4. Include time estimates in milliseconds when known

### Error Handling

The server passes through raw ClickUp API errors, which include:
- Invalid list/task IDs
- Permission errors
- Rate limiting
- Validation errors (e.g., invalid status, missing required fields)

### Common Patterns

#### Find tasks assigned to me
```typescript
// First, get your user ID from workspace structure
const workspace = await clickup_get_workspace_structure();

// Then search for your tasks
clickup_search_tasks({
  query: "",
  scope: "workspace",
  team_id: workspace.teams[0].id,
  assignees: ["your_user_id"]
})
```

#### Create task with due date
```typescript
// Convert natural language to timestamp
const dueDate = new Date("2024-12-31").getTime();

clickup_create_task({
  list_id: "901234567",
  name: "Year-end report",
  due_date: dueDate,
  priority: 2
})
```

## Limitations

- Maximum 100 tasks per page in list/search operations
- Custom fields not supported in this version
- Rate limits apply based on your ClickUp plan
- Attachments and time tracking not yet implemented

## Development

### Building from source

```bash
npm install
npm run build
```

### Testing locally

```bash
CLICKUP_API_TOKEN=your_token npm run dev
```

## Contributing

Contributions welcome! Please ensure:
- TypeScript types are properly defined
- Tool descriptions include usage guidelines
- Error messages are helpful
- Code follows existing patterns

## License

MIT