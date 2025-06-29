import { 
  ClickUpTask, 
  CreateTaskRequest, 
  UpdateTaskRequest, 
  ListTasksRequest,
  SearchTasksRequest,
  TasksResponse,
  CreateCommentRequest,
  CommentsResponse,
  ClickUpComment,
  TaskDependencyRequest,
  ClickUpDependency
} from './types.js';

export class ClickUpClient {
  private readonly baseUrl = 'https://api.clickup.com/api/v2';
  private readonly apiToken: string;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error('ClickUp API token is required');
    }
    this.apiToken = apiToken;
  }

  private async request<T>(
    method: string, 
    path: string, 
    body?: any,
    queryParams?: Record<string, any>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    
    // Add query parameters
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);
    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `ClickUp API error: ${response.status} ${response.statusText}\n` +
        JSON.stringify(responseData, null, 2)
      );
    }

    return responseData as T;
  }

  // Task operations

  async createTask(listId: string, task: CreateTaskRequest): Promise<ClickUpTask> {
    return this.request<ClickUpTask>('POST', `/list/${listId}/task`, task);
  }

  async getTask(taskId: string): Promise<ClickUpTask> {
    return this.request<ClickUpTask>('GET', `/task/${taskId}`);
  }

  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<ClickUpTask> {
    return this.request<ClickUpTask>('PUT', `/task/${taskId}`, updates);
  }

  async deleteTask(taskId: string): Promise<{}> {
    return this.request<{}>('DELETE', `/task/${taskId}`);
  }

  async listTasks(listId: string, params?: ListTasksRequest): Promise<TasksResponse> {
    const queryParams = {
      ...params,
      archived: params?.archived ?? false,
      page: params?.page ?? 0,
      include_closed: params?.include_closed ?? false,
    };

    return this.request<TasksResponse>('GET', `/list/${listId}/task`, undefined, queryParams);
  }

  async searchTasks(teamId: string, params: SearchTasksRequest): Promise<TasksResponse> {
    const queryParams = {
      ...params,
      page: params.page ?? 0,
      include_closed: params.include_closed ?? false,
    };

    return this.request<TasksResponse>('GET', `/team/${teamId}/task`, undefined, queryParams);
  }

  // Comment operations

  async createComment(taskId: string, comment: CreateCommentRequest): Promise<ClickUpComment> {
    return this.request<ClickUpComment>('POST', `/task/${taskId}/comment`, comment);
  }

  async getComments(taskId: string): Promise<CommentsResponse> {
    return this.request<CommentsResponse>('GET', `/task/${taskId}/comment`);
  }

  async updateComment(commentId: string, commentText: string, resolved?: boolean): Promise<void> {
    const body = {
      comment_text: commentText,
      resolved
    };
    return this.request<void>('PUT', `/comment/${commentId}`, body);
  }

  async deleteComment(commentId: string): Promise<void> {
    return this.request<void>('DELETE', `/comment/${commentId}`);
  }

  // Dependency operations

  async addDependency(taskId: string, dependency: TaskDependencyRequest): Promise<ClickUpDependency> {
    return this.request<ClickUpDependency>('POST', `/task/${taskId}/dependency`, dependency);
  }

  async deleteDependency(taskId: string, params: { depends_on?: string; dependency_of?: string }): Promise<void> {
    return this.request<void>('DELETE', `/task/${taskId}/dependency`, undefined, params);
  }

  async getTaskWithDependencies(taskId: string): Promise<ClickUpTask> {
    // The regular getTask includes dependency information
    return this.getTask(taskId);
  }

  // Workspace/Team operations

  async getAuthorizedTeams(): Promise<{ teams: Array<{ id: string; name: string; color: string; avatar: string }> }> {
    return this.request('GET', '/team');
  }

  async getSpaces(teamId: string): Promise<{ spaces: Array<{ id: string; name: string }> }> {
    return this.request('GET', `/team/${teamId}/space`);
  }

  async getLists(spaceId: string): Promise<{ lists: Array<{ id: string; name: string }> }> {
    return this.request('GET', `/space/${spaceId}/list`);
  }

  async getFolderLists(folderId: string): Promise<{ lists: Array<{ id: string; name: string }> }> {
    return this.request('GET', `/folder/${folderId}/list`);
  }

  // Helper method to get workspace structure
  async getWorkspaceStructure(): Promise<{
    teams: Array<{
      id: string;
      name: string;
      spaces: Array<{
        id: string;
        name: string;
        lists: Array<{
          id: string;
          name: string;
        }>;
      }>;
    }>;
  }> {
    const { teams } = await this.getAuthorizedTeams();
    const result = await Promise.all(
      teams.map(async team => {
        const { spaces } = await this.getSpaces(team.id);
        const spacesWithLists = await Promise.all(
          spaces.map(async space => {
            const { lists } = await this.getLists(space.id);
            return { ...space, lists };
          })
        );
        return { ...team, spaces: spacesWithLists };
      })
    );
    return { teams: result };
  }
}