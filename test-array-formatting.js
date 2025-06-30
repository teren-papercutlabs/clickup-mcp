// Test example demonstrating array parameter formatting fix

// Mock URL constructor behavior
function formatUrlBefore(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            url.searchParams.append(key, value);
        }
    });
    return url.toString();
}

function formatUrlAfter(baseUrl, params) {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            if (Array.isArray(value)) {
                // Fixed: Properly handle arrays by appending each value separately
                value.forEach(item => {
                    url.searchParams.append(key, item);
                });
            } else {
                url.searchParams.append(key, value);
            }
        }
    });
    return url.toString();
}

// Test examples
const baseUrl = 'https://api.clickup.com/api/v2/list/123/task';
const testParams = {
    name: 'Test Task',
    assignees: [123, 456],
    tags: ['urgent', 'bug'],
    priority: 1
};

console.log('=== Array Parameter Formatting Test ===\n');

console.log('Test Parameters:');
console.log(JSON.stringify(testParams, null, 2));
console.log('\n');

console.log('BEFORE FIX (Wrong - arrays converted to strings):');
const urlBefore = formatUrlBefore(baseUrl, testParams);
console.log(urlBefore);
console.log('Decoded query string:', decodeURIComponent(urlBefore.split('?')[1]));
console.log('\n');

console.log('AFTER FIX (Correct - each array item as separate parameter):');
const urlAfter = formatUrlAfter(baseUrl, testParams);
console.log(urlAfter);
console.log('Decoded query string:', decodeURIComponent(urlAfter.split('?')[1]));
console.log('\n');

// Show the specific difference for assignees
console.log('=== Specific Example: assignees=[123, 456] ===\n');

console.log('BEFORE (incorrect):');
console.log('  URL parameters: assignees=123,456');
console.log('  → Server receives: "123,456" as a single string');
console.log('  → ClickUp API expects array but gets string → 400 Bad Request\n');

console.log('AFTER (correct):');
console.log('  URL parameters: assignees=123&assignees=456');
console.log('  → Server receives: ["123", "456"] as array');
console.log('  → ClickUp API gets expected array format → Success');