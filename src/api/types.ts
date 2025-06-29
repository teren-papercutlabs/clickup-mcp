// ClickUp API Types

export interface ClickUpTask {
  id: string;
  custom_id?: string;
  name: string;
  text_content?: string;
  description?: string;
  status: ClickUpStatus;
  orderindex: string;
  date_created: string;
  date_updated: string;
  date_closed?: string;
  date_done?: string;
  archived: boolean;
  creator: ClickUpUser;
  assignees: ClickUpUser[];
  watchers: ClickUpUser[];
  checklists: ClickUpChecklist[];
  tags: ClickUpTag[];
  parent?: string;
  priority?: ClickUpPriority;
  due_date?: string;
  start_date?: string;
  points?: number;
  time_estimate?: number;
  time_spent?: number;
  custom_fields: ClickUpCustomField[];
  dependencies: string[];
  linked_tasks: ClickUpLinkedTask[];
  team_id: string;
  url: string;
  permission_level: string;
  list: ClickUpList;
  project: ClickUpProject;
  folder: ClickUpFolder;
  space: ClickUpSpace;
}

export interface ClickUpStatus {
  id?: string;
  status: string;
  color: string;
  orderindex: number;
  type: string;
}

export interface ClickUpUser {
  id: number;
  username: string;
  email: string;
  color?: string;
  initials?: string;
  profilePicture?: string;
}

export interface ClickUpPriority {
  id: string;
  priority: string;
  color: string;
  orderindex: string;
}

export interface ClickUpTag {
  name: string;
  tag_fg: string;
  tag_bg: string;
  creator: number;
}

export interface ClickUpChecklist {
  id: string;
  task_id: string;
  name: string;
  date_created: string;
  orderindex: number;
  creator: number;
  resolved: number;
  unresolved: number;
  items: ClickUpChecklistItem[];
}

export interface ClickUpChecklistItem {
  id: string;
  name: string;
  orderindex: number;
  resolved: boolean;
  assignee?: ClickUpUser;
  date_created: string;
  date_resolved?: string;
}

export interface ClickUpCustomField {
  id: string;
  name: string;
  type: string;
  type_config: any;
  date_created: string;
  hide_from_guests: boolean;
  value?: any;
  required: boolean;
}

export interface ClickUpLinkedTask {
  task_id: string;
  link_id: string;
  date_created: string;
  userid: string;
}

export interface ClickUpList {
  id: string;
  name: string;
  access: boolean;
}

export interface ClickUpProject {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface ClickUpFolder {
  id: string;
  name: string;
  hidden: boolean;
  access: boolean;
}

export interface ClickUpSpace {
  id: string;
  name: string;
  access: boolean;
}

export interface ClickUpComment {
  id: string;
  comment: ClickUpCommentContent[];
  comment_text: string;
  user: ClickUpUser;
  assignee?: ClickUpUser;
  assigned_by?: ClickUpUser;
  reactions: ClickUpReaction[];
  date: string;
  resolved: boolean;
  resolved_by?: ClickUpUser;
}

export interface ClickUpCommentContent {
  text: string;
  attributes?: any;
}

export interface ClickUpReaction {
  reaction: string;
  date: string;
  user: ClickUpUser;
}

export interface ClickUpDependency {
  task_id: string;
  depends_on: string;
  type: 0 | 1; // 0 = waiting on, 1 = blocking
  date_created: string;
  userid: string;
}

// Request/Response Types

export interface CreateTaskRequest {
  name: string;
  description?: string;
  markdown_description?: string;
  assignees?: number[];
  tags?: string[];
  status?: string;
  priority?: number; // 1 = urgent, 2 = high, 3 = normal, 4 = low
  due_date?: number; // Unix timestamp in milliseconds
  due_date_time?: boolean;
  time_estimate?: number; // Time in milliseconds
  start_date?: number;
  start_date_time?: boolean;
  notify_all?: boolean;
  parent?: string;
  links_to?: string;
  check_required_custom_fields?: boolean;
  custom_fields?: Array<{
    id: string;
    value: any;
  }>;
}

export interface UpdateTaskRequest {
  name?: string;
  description?: string;
  markdown_description?: string;
  assignees?: {
    add?: number[];
    rem?: number[];
  };
  tags?: {
    add?: string[];
    rem?: string[];
  };
  status?: string;
  priority?: number;
  due_date?: number;
  due_date_time?: boolean;
  time_estimate?: number;
  start_date?: number;
  start_date_time?: boolean;
  archived?: boolean;
  parent?: string;
}

export interface ListTasksRequest {
  archived?: boolean;
  page?: number;
  order_by?: string;
  reverse?: boolean;
  subtasks?: boolean;
  space_ids?: string[];
  project_ids?: string[];
  list_ids?: string[];
  statuses?: string[];
  include_closed?: boolean;
  assignees?: string[];
  tags?: string[];
  due_date_gt?: number;
  due_date_lt?: number;
  date_created_gt?: number;
  date_created_lt?: number;
  date_updated_gt?: number;
  date_updated_lt?: number;
  date_done_gt?: number;
  date_done_lt?: number;
  custom_fields?: Array<{
    field_id: string;
    operator: string;
    value: any;
  }>;
}

export interface SearchTasksRequest {
  query: string;
  order_by?: string;
  reverse?: boolean;
  page?: number;
  list_ids?: string[];
  space_ids?: string[];
  folder_ids?: string[];
  statuses?: string[];
  assignees?: string[];
  tags?: string[];
  due_date_gt?: number;
  due_date_lt?: number;
  date_created_gt?: number;
  date_created_lt?: number;
  date_updated_gt?: number;
  date_updated_lt?: number;
  include_closed?: boolean;
}

export interface CreateCommentRequest {
  comment_text: string;
  assignee?: number;
  notify_all?: boolean;
}

export interface TaskDependencyRequest {
  depends_on?: string;
  dependency_of?: string;
}

// API Response Types

export interface ClickUpApiResponse<T> {
  [key: string]: T;
}

export interface TasksResponse {
  tasks: ClickUpTask[];
  last_page: boolean;
}

export interface CommentsResponse {
  comments: ClickUpComment[];
}