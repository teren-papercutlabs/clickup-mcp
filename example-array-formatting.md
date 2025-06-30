# Array Parameter Formatting Fix

## Before (Without Square Brackets)
When passing `assignees: [123, 456]` as a query parameter:
- Generated URL: `https://api.clickup.com/api/v2/list/abc/task?assignees=123&assignees=456`
- ClickUp API may not recognize this as an array parameter

## After (With Square Brackets)
When passing `assignees: [123, 456]` as a query parameter:
- Generated URL: `https://api.clickup.com/api/v2/list/abc/task?assignees[]=123&assignees[]=456`
- ClickUp API correctly recognizes this as an array parameter

## Affected Parameters
The following array parameters now use square bracket notation:
- `assignees[]` - User IDs for task assignment
- `tags[]` - Tag names for filtering
- `statuses[]` - Status names for filtering
- `space_ids[]` - Space IDs for search scope
- `folder_ids[]` - Folder IDs for search scope
- `list_ids[]` - List IDs for search scope
- `assignees_add[]` - User IDs to add (updateTask)
- `assignees_rem[]` - User IDs to remove (updateTask)
- `tags_add[]` - Tags to add (updateTask)
- `tags_rem[]` - Tags to remove (updateTask)

This formatting follows the PHP/Rails convention for array parameters in query strings, which many APIs (including ClickUp) expect for proper array handling.