#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ClickUpClient } from './api/client.js';

// Tool argument types
interface CreateTaskArgs {
  list_id: string;
  name: string;
  description?: string;
  markdown_description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  time_estimate?: number;
  start_date?: number;
  notify_all?: boolean;
  parent?: string;
}

interface GetTaskArgs {
  task_id: string;
}

interface UpdateTaskArgs {
  task_id: string;
  name?: string;
  description?: string;
  markdown_description?: string;
  assignees_add?: number[];
  assignees_rem?: number[];
  tags_add?: string[];
  tags_rem?: string[];
  status?: string;
  priority?: number;
  due_date?: number;
  time_estimate?: number;
  archived?: boolean;
}

interface DeleteTaskArgs {
  task_id: string;
}

interface ListTasksArgs {
  list_id: string;
  page?: number;
  archived?: boolean;
  include_closed?: boolean;
  assignees?: string[];
  statuses?: string[];
  tags?: string[];
  due_date_gt?: number;
  due_date_lt?: number;
}

interface SearchTasksArgs {
  query: string;
  scope: 'workspace' | 'space' | 'folder' | 'list';
  team_id?: string;
  space_id?: string;
  folder_id?: string;
  list_id?: string;
  page?: number;
  include_closed?: boolean;
  assignees?: string[];
  statuses?: string[];
  tags?: string[];
  due_date_gt?: number;
  due_date_lt?: number;
}

interface AddCommentArgs {
  task_id: string;
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
}

interface ListCommentsArgs {
  task_id: string;
}

interface DependencyArgs {
  task_id: string;
  depends_on?: string;
  dependency_of?: string;
}

// Get API token from environment
const apiToken = process.env.CLICKUP_API_TOKEN;
if (!apiToken) {
  console.error('Error: CLICKUP_API_TOKEN environment variable is required');
  process.exit(1);
}

// Initialize ClickUp client
const clickup = new ClickUpClient(apiToken);

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'clickup_create_task',
    description: `Create a new task in ClickUp with smart defaults and validation.

⚠️ USAGE GUIDELINES:
- ALWAYS specify a list_id - tasks must belong to a list
- Use markdown_description for rich formatting over plain description
- Set priority: 1=Urgent, 2=High, 3=Normal, 4=Low (default: 3)
- Include time_estimate in milliseconds if discussed
- Add assignees array with user IDs if users are mentioned
- Due dates should be Unix timestamps in milliseconds

BEST PRACTICES:
1. Ask for list/space if not specified by user
2. Default to priority 3 (Normal) unless urgency indicated
3. Parse natural language dates to unix timestamps
4. Set meaningful task names (action-oriented)
5. Use tags for categorization (e.g., "bug", "feature", "enhancement")

COMMON PATTERNS:
- Bug report → priority: 2, tag: "bug"
- Feature request → priority: 3, tag: "feature"
- Urgent fix → priority: 1
- Meeting notes → Create task, then add as comment

ERROR HANDLING:
- List not found → Ask user to specify correct list
- Invalid assignee → List available team members with clickup_get_workspace_structure
- Missing required info → Ask user for clarification`,
    inputSchema: {
      type: 'object',
      properties: {
        list_id: { 
          type: 'string',
          description: 'The list ID where the task will be created'
        },
        name: { 
          type: 'string',
          description: 'The task name/title'
        },
        description: { 
          type: 'string',
          description: 'Plain text description (use markdown_description for formatting)'
        },
        markdown_description: { 
          type: 'string',
          description: 'Markdown formatted description (preferred over plain description)'
        },
        assignees: {
          type: 'array',
          items: { type: 'number' },
          description: 'Array of user IDs to assign to the task'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for categorization'
        },
        status: {
          type: 'string',
          description: 'Task status (must match list statuses)'
        },
        priority: {
          type: 'number',
          description: '1=Urgent, 2=High, 3=Normal, 4=Low'
        },
        due_date: {
          type: 'number',
          description: 'Due date as Unix timestamp in milliseconds'
        },
        time_estimate: {
          type: 'number',
          description: 'Time estimate in milliseconds'
        },
        start_date: {
          type: 'number',
          description: 'Start date as Unix timestamp in milliseconds'
        },
        notify_all: {
          type: 'boolean',
          description: 'Whether to notify all assignees'
        },
        parent: {
          type: 'string',
          description: 'Parent task ID for subtasks'
        }
      },
      required: ['list_id', 'name']
    }
  },
  {
    name: 'clickup_get_task',
    description: `Retrieve detailed information about a specific task.

Returns complete task details including:
- Basic info (name, description, status, priority)
- Assignees and creator information
- Dates (created, updated, due, start)
- Dependencies and linked tasks
- Comments count and checklist progress
- Custom field values
- Full hierarchy (space, folder, list)

USE CASES:
- View task details before updating
- Check task status and assignees
- Review dependencies before marking complete
- Get task URL for sharing`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to retrieve'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_update_task',
    description: `Update an existing task's properties.

⚠️ UPDATE BEHAVIOR:
- Only include fields you want to change
- For assignees/tags use add/rem arrays
- Omitted fields remain unchanged
- Cannot update custom fields (use separate endpoint)

FIELD BEHAVIORS:
- assignees: { add: [userId], rem: [userId] }
- tags: { add: ["tag1"], rem: ["tag2"] }
- status: Must match available statuses in the list
- archived: true to archive, false to unarchive

COMMON UPDATES:
- Mark complete → Update status to closed status
- Reassign → Use assignees add/rem
- Change priority → Set new priority number
- Update dates → Provide new timestamps`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to update'
        },
        name: { 
          type: 'string',
          description: 'New task name'
        },
        description: { 
          type: 'string',
          description: 'New plain text description'
        },
        markdown_description: { 
          type: 'string',
          description: 'New markdown description'
        },
        assignees_add: {
          type: 'array',
          items: { type: 'number' },
          description: 'User IDs to add as assignees'
        },
        assignees_rem: {
          type: 'array',
          items: { type: 'number' },
          description: 'User IDs to remove from assignees'
        },
        tags_add: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to add'
        },
        tags_rem: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to remove'
        },
        status: {
          type: 'string',
          description: 'New status'
        },
        priority: {
          type: 'number',
          description: 'New priority (1-4)'
        },
        due_date: {
          type: 'number',
          description: 'New due date timestamp'
        },
        time_estimate: {
          type: 'number',
          description: 'New time estimate in ms'
        },
        archived: {
          type: 'boolean',
          description: 'Archive/unarchive the task'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_delete_task',
    description: `Delete a task permanently from ClickUp.

⚠️ WARNING:
- This action cannot be undone
- Deletes all associated data (comments, attachments, etc.)
- Consider archiving instead for recoverable deletion

USE CASES:
- Remove test/temporary tasks
- Clean up duplicate tasks
- Delete mistakenly created tasks

BEST PRACTICES:
- Confirm with user before deleting
- Suggest archiving for tasks with history
- Check dependencies before deleting`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to delete'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_list_tasks',
    description: `List tasks from a specific list with pagination support.

⚠️ LIMITATIONS:
- Maximum 100 tasks per page
- Only returns tasks where specified list is their home
- Tasks added from other lists not included

PAGINATION:
- page: 0-based page number
- Response includes last_page boolean
- Iterate pages until last_page is true

FILTERING OPTIONS:
- archived: Include/exclude archived tasks
- statuses: Filter by specific statuses
- assignees: Filter by user IDs
- tags: Filter by tag names
- Date filters use Unix timestamps

ORDERING:
- order_by: Field to sort by
- reverse: true for descending order

BEST PRACTICES:
- Use filters to reduce result set
- Implement pagination for large lists
- Cache results when appropriate`,
    inputSchema: {
      type: 'object',
      properties: {
        list_id: { 
          type: 'string',
          description: 'The list ID to get tasks from'
        },
        page: {
          type: 'number',
          description: 'Page number (0-based)'
        },
        archived: {
          type: 'boolean',
          description: 'Include archived tasks'
        },
        include_closed: {
          type: 'boolean',
          description: 'Include closed tasks'
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by assignee user IDs'
        },
        statuses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by status names'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        due_date_gt: {
          type: 'number',
          description: 'Tasks due after this timestamp'
        },
        due_date_lt: {
          type: 'number',
          description: 'Tasks due before this timestamp'
        }
      },
      required: ['list_id']
    }
  },
  {
    name: 'clickup_search_tasks',
    description: `Search for tasks with flexible scope control.

SCOPE PARAMETER CONTROLS SEARCH AREA:
- "workspace": Search entire workspace (slowest, broadest)
- "space": Search within specific space (space_id required)
- "folder": Search within folder (folder_id required)
- "list": Search within list (list_id required)

PERFORMANCE TIPS:
- Narrower scope = faster results
- List search is 10x faster than workspace search
- Use workspace search only when truly needed
- Maximum 100 results per page

SMART DEFAULTS:
- If user mentions specific list/space, automatically narrow scope
- If searching "my tasks", workspace scope is appropriate
- For project-specific searches, suggest list/folder scope

SEARCH SYNTAX:
- Text search matches task name and description
- Use filters to narrow results further
- Combine multiple filters for precision

EXAMPLES:
"Find bugs in the API project"
→ Scope: list, query: "bug", find API project list first

"Show all my overdue tasks"
→ Scope: workspace, assignees: [current_user], due_date_lt: now

PAGINATION:
- Use page parameter (0-based)
- Check last_page in response
- Iterate until last_page is true`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { 
          type: 'string',
          description: 'Search query text'
        },
        scope: {
          type: 'string',
          enum: ['workspace', 'space', 'folder', 'list'],
          description: 'Search scope - narrower is faster'
        },
        team_id: {
          type: 'string',
          description: 'Team/Workspace ID (required for workspace scope)'
        },
        space_id: {
          type: 'string',
          description: 'Space ID (required for space scope)'
        },
        folder_id: {
          type: 'string',
          description: 'Folder ID (required for folder scope)'
        },
        list_id: {
          type: 'string',
          description: 'List ID (required for list scope)'
        },
        page: {
          type: 'number',
          description: 'Page number (0-based)'
        },
        include_closed: {
          type: 'boolean',
          description: 'Include closed tasks in results'
        },
        assignees: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by assignee user IDs'
        },
        statuses: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by status names'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags'
        },
        due_date_gt: {
          type: 'number',
          description: 'Tasks due after this timestamp'
        },
        due_date_lt: {
          type: 'number',
          description: 'Tasks due before this timestamp'
        }
      },
      required: ['query', 'scope']
    }
  },
  {
    name: 'clickup_add_comment',
    description: `Add a comment to a task.

COMMENT FEATURES:
- Plain text comments (HTML/Markdown in text interpreted as plain text)
- Assign comments to users for action items
- Notify all watchers with notify_all flag
- Comments appear in task activity feed

USE CASES:
- Add progress updates
- Ask questions or request clarification
- Document decisions or changes
- Create action items with assignee

BEST PRACTICES:
- Keep comments concise and actionable
- Use assignee for comments requiring response
- Include context for future reference
- Use notify_all sparingly to avoid spam`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to comment on'
        },
        comment_text: {
          type: 'string',
          description: 'The comment text content'
        },
        assignee: {
          type: 'number',
          description: 'User ID to assign the comment to'
        },
        notify_all: {
          type: 'boolean',
          description: 'Notify all task watchers'
        }
      },
      required: ['task_id', 'comment_text']
    }
  },
  {
    name: 'clickup_list_comments',
    description: `Retrieve all comments for a task.

RETURNS:
- All comments in chronological order
- Comment text and metadata
- User information for each comment
- Resolved status and resolver
- Assignee information if assigned

USE CASES:
- Review task discussion history
- Find specific decisions or updates
- Check for unresolved questions
- Audit task communication`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to get comments for'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_add_dependency',
    description: `Create dependency relationships between tasks.

DEPENDENCY TYPES:
- BLOCKING: This task blocks another (dependency_of)
- WAITING_ON: This task waits for another (depends_on)

IMPORTANT:
- Use task_id for the task you're modifying
- Use depends_on when task_id waits for another task
- Use dependency_of when task_id blocks another task
- Cannot create circular dependencies

USAGE PATTERNS:
"Task A blocks Task B"
→ task_id: A, dependency_of: B

"Task C waits on Task D"
→ task_id: C, depends_on: D

BEST PRACTICES:
- Verify both tasks exist first
- Check for circular dependencies
- Use for project planning and sequencing
- Document why dependency exists in comments`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to add dependency to'
        },
        depends_on: {
          type: 'string',
          description: 'Task ID that this task waits for'
        },
        dependency_of: {
          type: 'string',
          description: 'Task ID that this task blocks'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_remove_dependency',
    description: `Remove a dependency relationship between tasks.

SPECIFY ONE OF:
- depends_on: Remove "waiting on" relationship
- dependency_of: Remove "blocking" relationship

USAGE:
To remove "Task A waits on Task B":
→ task_id: A, depends_on: B

To remove "Task C blocks Task D":
→ task_id: C, dependency_of: D`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to remove dependency from'
        },
        depends_on: {
          type: 'string',
          description: 'Remove waiting on this task ID'
        },
        dependency_of: {
          type: 'string',
          description: 'Remove blocking this task ID'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_list_dependencies',
    description: `View all dependency relationships for a task.

RETURNS:
- Tasks this task is waiting on (dependencies)
- Tasks this task is blocking (dependents)
- Linked tasks (non-blocking relationships)
- Basic info for each related task

USE CASES:
- Check what's blocking task completion
- See impact of delaying a task
- Understand task relationships
- Validate project timeline

INTERPRETING RESULTS:
- "dependencies" = tasks that must complete first
- "dependents" = tasks waiting for this one
- Review both to understand full impact`,
    inputSchema: {
      type: 'object',
      properties: {
        task_id: { 
          type: 'string',
          description: 'The task ID to get dependencies for'
        }
      },
      required: ['task_id']
    }
  },
  {
    name: 'clickup_get_workspace_structure',
    description: `Discover the workspace hierarchy (teams, spaces, lists).

RETURNS HIERARCHICAL STRUCTURE:
- Teams (Workspaces) you have access to
- Spaces within each team
- Lists within each space

USE THIS TO:
- Find correct list_id for task creation
- Understand workspace organization
- Discover available spaces and lists
- Get IDs needed for other operations

BEST PRACTICES:
- Cache results as structure rarely changes
- Use to validate IDs before operations
- Show user available options when needed`,
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// Create MCP server
const server = new Server(
  {
    name: 'clickup',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'clickup_create_task': {
        const typedArgs = args as unknown as CreateTaskArgs;
        const task = await clickup.createTask(typedArgs.list_id, {
          name: typedArgs.name,
          description: typedArgs.description,
          markdown_description: typedArgs.markdown_description,
          assignees: typedArgs.assignees,
          tags: typedArgs.tags,
          status: typedArgs.status,
          priority: typedArgs.priority,
          due_date: typedArgs.due_date,
          time_estimate: typedArgs.time_estimate,
          start_date: typedArgs.start_date,
          notify_all: typedArgs.notify_all,
          parent: typedArgs.parent,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(task, null, 2),
          }],
        };
      }

      case 'clickup_get_task': {
        const typedArgs = args as unknown as GetTaskArgs;
        const task = await clickup.getTask(typedArgs.task_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(task, null, 2),
          }],
        };
      }

      case 'clickup_update_task': {
        const typedArgs = args as unknown as UpdateTaskArgs;
        const updates: any = {};
        if (typedArgs.name !== undefined) updates.name = typedArgs.name;
        if (typedArgs.description !== undefined) updates.description = typedArgs.description;
        if (typedArgs.markdown_description !== undefined) updates.markdown_description = typedArgs.markdown_description;
        if (typedArgs.status !== undefined) updates.status = typedArgs.status;
        if (typedArgs.priority !== undefined) updates.priority = typedArgs.priority;
        if (typedArgs.due_date !== undefined) updates.due_date = typedArgs.due_date;
        if (typedArgs.time_estimate !== undefined) updates.time_estimate = typedArgs.time_estimate;
        if (typedArgs.archived !== undefined) updates.archived = typedArgs.archived;
        
        if (typedArgs.assignees_add || typedArgs.assignees_rem) {
          updates.assignees = {};
          if (typedArgs.assignees_add) updates.assignees.add = typedArgs.assignees_add;
          if (typedArgs.assignees_rem) updates.assignees.rem = typedArgs.assignees_rem;
        }
        
        if (typedArgs.tags_add || typedArgs.tags_rem) {
          updates.tags = {};
          if (typedArgs.tags_add) updates.tags.add = typedArgs.tags_add;
          if (typedArgs.tags_rem) updates.tags.rem = typedArgs.tags_rem;
        }

        const task = await clickup.updateTask(typedArgs.task_id, updates);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(task, null, 2),
          }],
        };
      }

      case 'clickup_delete_task': {
        const typedArgs = args as unknown as DeleteTaskArgs;
        await clickup.deleteTask(typedArgs.task_id);
        return {
          content: [{
            type: 'text',
            text: `Task ${typedArgs.task_id} has been deleted successfully.`,
          }],
        };
      }

      case 'clickup_list_tasks': {
        const typedArgs = args as unknown as ListTasksArgs;
        const response = await clickup.listTasks(typedArgs.list_id, {
          page: typedArgs.page,
          archived: typedArgs.archived,
          include_closed: typedArgs.include_closed,
          assignees: typedArgs.assignees,
          statuses: typedArgs.statuses,
          tags: typedArgs.tags,
          due_date_gt: typedArgs.due_date_gt,
          due_date_lt: typedArgs.due_date_lt,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      case 'clickup_search_tasks': {
        const typedArgs = args as unknown as SearchTasksArgs;
        let response;
        const searchParams: any = {
          query: typedArgs.query,
          page: typedArgs.page,
          include_closed: typedArgs.include_closed,
          assignees: typedArgs.assignees,
          statuses: typedArgs.statuses,
          tags: typedArgs.tags,
          due_date_gt: typedArgs.due_date_gt,
          due_date_lt: typedArgs.due_date_lt,
        };

        switch (typedArgs.scope) {
          case 'workspace':
            if (!typedArgs.team_id) throw new Error('team_id is required for workspace scope');
            response = await clickup.searchTasks(typedArgs.team_id, searchParams);
            break;
          
          case 'space':
            if (!typedArgs.space_id) throw new Error('space_id is required for space scope');
            searchParams.space_ids = [typedArgs.space_id];
            response = await clickup.searchTasks(typedArgs.team_id!, searchParams);
            break;
          
          case 'folder':
            if (!typedArgs.folder_id) throw new Error('folder_id is required for folder scope');
            searchParams.folder_ids = [typedArgs.folder_id];
            response = await clickup.searchTasks(typedArgs.team_id!, searchParams);
            break;
          
          case 'list':
            if (!typedArgs.list_id) throw new Error('list_id is required for list scope');
            searchParams.list_ids = [typedArgs.list_id];
            response = await clickup.searchTasks(typedArgs.team_id!, searchParams);
            break;
          
          default:
            throw new Error(`Invalid scope: ${typedArgs.scope}`);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      case 'clickup_add_comment': {
        const typedArgs = args as unknown as AddCommentArgs;
        const comment = await clickup.createComment(typedArgs.task_id, {
          comment_text: typedArgs.comment_text,
          assignee: typedArgs.assignee,
          notify_all: typedArgs.notify_all,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(comment, null, 2),
          }],
        };
      }

      case 'clickup_list_comments': {
        const typedArgs = args as unknown as ListCommentsArgs;
        const response = await clickup.getComments(typedArgs.task_id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(response, null, 2),
          }],
        };
      }

      case 'clickup_add_dependency': {
        const typedArgs = args as unknown as DependencyArgs;
        const dependency = await clickup.addDependency(typedArgs.task_id, {
          depends_on: typedArgs.depends_on,
          dependency_of: typedArgs.dependency_of,
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(dependency, null, 2),
          }],
        };
      }

      case 'clickup_remove_dependency': {
        const typedArgs = args as unknown as DependencyArgs;
        await clickup.deleteDependency(typedArgs.task_id, {
          depends_on: typedArgs.depends_on,
          dependency_of: typedArgs.dependency_of,
        });
        return {
          content: [{
            type: 'text',
            text: `Dependency removed successfully from task ${typedArgs.task_id}`,
          }],
        };
      }

      case 'clickup_list_dependencies': {
        const typedArgs = args as unknown as DependencyArgs;
        const task = await clickup.getTaskWithDependencies(typedArgs.task_id);
        
        // Extract dependency information
        const result = {
          task_id: task.id,
          task_name: task.name,
          dependencies: task.dependencies || [],
          linked_tasks: task.linked_tasks || [],
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case 'clickup_get_workspace_structure': {
        const structure = await clickup.getWorkspaceStructure();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(structure, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`,
      }],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ClickUp MCP server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});