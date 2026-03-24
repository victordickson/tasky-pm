let userid = getCookie("userID");
let username = getCookie("username");
let allTodos = [];
let allProjects = [];
let currentView = 'dashboard';
let currentFilter = 'all';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    if (!userid) {
        window.location.href = '/';
        return;
    }
    
    document.getElementById('username').textContent = username;
    initializeNavigation();
    loadProjects();
    loadTasks();
    loadStats();
    initializeFilters();
    initializeTaskForm();
    initializeProjectForm();
});

// Navigation
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    console.log('Switching to view:', view);
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    document.getElementById(`${view}-view`).classList.add('active');
    
    currentView = view;
    
    if (view === 'kanban') renderKanban();
    if (view === 'calendar') {
        console.log('Rendering calendar...');
        renderCalendar();
    }
    if (view === 'projects') renderProjects();
    if (view === 'tasks') renderTasks();
}

// API Calls
async function loadTasks() {
    try {
        const response = await fetch(`/todos/${userid}`);
        if (response.ok) {
            const data = await response.json();
            allTodos = data || [];
            renderTasks();
            renderKanban();
            renderDashboard();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
        allTodos = [];
    }
}

async function loadProjects() {
    try {
        const response = await fetch(`/projects/${userid}`);
        if (response.ok) {
            allProjects = await response.json() || [];
            updateProjectSelects();
            renderProjects();
        }
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function loadStats() {
    try {
        const response = await fetch(`/stats/${userid}`);
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-total').textContent = stats.total;
            document.getElementById('stat-completed').textContent = stats.completed;
            document.getElementById('stat-pending').textContent = stats.pending;
            document.getElementById('stat-overdue').textContent = stats.overdue;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function saveTask(taskData) {
    const isEdit = taskData.id;
    const url = isEdit ? '/todo' : `/todo/${userid}`;
    const method = isEdit ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            await loadTasks();
            await loadStats();
            closeTaskModal();
        }
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        const response = await fetch(`/todo/${userid}/${taskId}`, { method: 'DELETE' });
        if (response.ok) {
            await loadTasks();
            await loadStats();
        }
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function saveProject(projectData) {
    try {
        const response = await fetch(`/project/${userid}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        if (response.ok) {
            await loadProjects();
            closeProjectModal();
        }
    } catch (error) {
        console.error('Error saving project:', error);
    }
}

async function deleteProject(projectId) {
    if (!confirm('Delete this project? Tasks will not be deleted.')) return;
    
    try {
        const response = await fetch(`/project/${userid}/${projectId}`, { method: 'DELETE' });
        if (response.ok) {
            await loadProjects();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

// Dashboard
function renderDashboard() {
    if (!allTodos || !Array.isArray(allTodos)) {
        allTodos = [];
    }
    
    const recentTasks = allTodos.slice(0, 5);
    const container = document.getElementById('recent-tasks-list');
    
    if (recentTasks.length === 0) {
        container.innerHTML = '<p style="color: #757575;">No tasks yet. Create your first task!</p>';
        return;
    }
    
    container.innerHTML = recentTasks.map(task => createTaskCard(task)).join('');
}

// Tasks View
function initializeFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    
    document.getElementById('priority-filter').addEventListener('change', renderTasks);
    document.getElementById('project-filter').addEventListener('change', renderTasks);
    document.getElementById('search-tasks').addEventListener('input', renderTasks);
}

function renderTasks() {
    const container = document.getElementById('tasks-list');
    const priorityFilter = document.getElementById('priority-filter')?.value;
    const projectFilter = document.getElementById('project-filter')?.value;
    const searchTerm = document.getElementById('search-tasks')?.value.toLowerCase();
    
    if (!allTodos || !Array.isArray(allTodos)) {
        allTodos = [];
    }
    
    let filtered = allTodos.filter(task => {
        if (currentFilter !== 'all' && task.status !== currentFilter) return false;
        if (priorityFilter && task.priority !== priorityFilter) return false;
        if (projectFilter && task.project_id !== projectFilter) return false;
        if (searchTerm && !task.name.toLowerCase().includes(searchTerm)) return false;
        return true;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #757575; padding: 40px;">No tasks found</p>';
        return;
    }
    
    container.innerHTML = filtered.map(task => createTaskCard(task)).join('');
}

function createTaskCard(task) {
    const project = allProjects.find(p => p.id === task.project_id);
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString() : '';
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    
    return `
        <div class="task-card" style="border-left-color: ${getPriorityColor(task.priority)}">
            <div class="task-header">
                <div>
                    <div class="task-title">${task.name}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                </div>
                <span class="priority-badge priority-${task.priority}">${task.priority}</span>
            </div>
            <div class="task-meta">
                ${dueDate ? `<span ${isOverdue ? 'style="color: #f44336;"' : ''}><i class="uil uil-calendar-alt"></i> ${dueDate}</span>` : ''}
                ${project ? `<span><i class="uil uil-folder"></i> ${project.name}</span>` : ''}
                ${task.category ? `<span><i class="uil uil-tag"></i> ${task.category}</span>` : ''}
                <span><i class="uil uil-clock"></i> ${task.status}</span>
            </div>
            <div class="task-actions">
                <button onclick="editTask('${task.id}')">Edit</button>
                <button onclick="deleteTask('${task.id}')">Delete</button>
            </div>
        </div>
    `;
}

// Kanban Board
function renderKanban() {
    if (!allTodos || !Array.isArray(allTodos)) {
        allTodos = [];
    }
    
    const statuses = ['pending', 'in-progress', 'completed'];
    
    statuses.forEach(status => {
        const tasks = allTodos.filter(t => t.status === status);
        const container = document.getElementById(`${status}-tasks`);
        document.getElementById(`${status}-count`).textContent = tasks.length;
        
        container.innerHTML = tasks.map(task => `
            <div class="kanban-task" draggable="true" data-id="${task.id}">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>${task.name}</strong>
                    <span class="priority-badge priority-${task.priority}">${task.priority}</span>
                </div>
                ${task.description ? `<p style="font-size: 13px; color: #757575; margin-bottom: 8px;">${task.description}</p>` : ''}
                ${task.due_date ? `<p style="font-size: 12px; color: #757575;"><i class="uil uil-calendar-alt"></i> ${new Date(task.due_date).toLocaleDateString()}</p>` : ''}
            </div>
        `).join('');
    });
    
    initializeDragAndDrop();
}

function initializeDragAndDrop() {
    const tasks = document.querySelectorAll('.kanban-task');
    const columns = document.querySelectorAll('.column-tasks');
    
    tasks.forEach(task => {
        task.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.dataset.id);
            task.style.opacity = '0.5';
        });
        
        task.addEventListener('dragend', (e) => {
            task.style.opacity = '1';
        });
    });
    
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.style.background = '#f5f5f5';
        });
        
        column.addEventListener('dragleave', () => {
            column.style.background = '';
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.style.background = '';
            
            const taskId = e.dataTransfer.getData('text/plain');
            const newStatus = column.parentElement.dataset.status;
            const task = allTodos.find(t => t.id === taskId);
            
            if (task && task.status !== newStatus) {
                task.status = newStatus;
                await saveTask(task);
            }
        });
    });
}

// Calendar
function renderCalendar() {
    console.log('renderCalendar called');
    const monthYear = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    
    console.log('Calendar elements:', { monthYear, grid });
    
    if (!monthYear || !grid) {
        console.error('Calendar elements not found!');
        return;
    }
    
    if (!allTodos || !Array.isArray(allTodos)) {
        allTodos = [];
    }
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();
    
    monthYear.textContent = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => 
        `<div style="font-weight: 700; text-align: center; padding: 16px; color: #6366f1; font-size: 14px;">${day}</div>`
    ).join('');
    
    for (let i = 0; i < startDay; i++) {
        html += '<div></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const isToday = date.toDateString() === new Date().toDateString();
        const tasksOnDay = allTodos.filter(t => t.due_date && new Date(t.due_date).toDateString() === date.toDateString());
        const hasTasks = tasksOnDay.length > 0;
        
        html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasTasks ? 'has-tasks' : ''}" title="${hasTasks ? tasksOnDay.length + ' task(s)' : ''}">${day}</div>`;
    }
    
    grid.innerHTML = html;
    console.log('Calendar rendered successfully');
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Projects
function renderProjects() {
    const container = document.getElementById('projects-list');
    
    if (allProjects.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #757575; padding: 40px;">No projects yet. Create your first project!</p>';
        return;
    }
    
    container.innerHTML = allProjects.map(project => {
        const taskCount = allTodos.filter(t => t.project_id === project.id).length;
        const completedCount = allTodos.filter(t => t.project_id === project.id && t.status === 'completed').length;
        
        return `
            <div class="project-card" style="border-top-color: ${project.color}">
                <div class="project-header">
                    <div class="project-name">${project.name}</div>
                    <button onclick="deleteProject('${project.id}')" style="background: none; border: none; cursor: pointer; color: #757575;">
                        <i class="uil uil-trash"></i>
                    </button>
                </div>
                ${project.description ? `<div class="project-description">${project.description}</div>` : ''}
                <div class="project-stats">
                    <span><i class="uil uil-check-circle"></i> ${completedCount}/${taskCount} tasks</span>
                </div>
            </div>
        `;
    }).join('');
}

function updateProjectSelects() {
    const selects = ['task-project', 'project-filter'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            const currentValue = select.value;
            const options = allProjects.map(p => 
                `<option value="${p.id}">${p.name}</option>`
            ).join('');
            
            if (id === 'task-project') {
                select.innerHTML = '<option value="">No Project</option>' + options;
            } else {
                select.innerHTML = '<option value="">All Projects</option>' + options;
            }
            select.value = currentValue;
        }
    });
}

// Task Modal
function openTaskModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('task-form');
    
    form.reset();
    document.getElementById('modal-title').textContent = taskId ? 'Edit Task' : 'New Task';
    
    if (taskId) {
        const task = allTodos.find(t => t.id === taskId);
        if (task) {
            document.getElementById('task-id').value = task.id;
            document.getElementById('task-name').value = task.name;
            document.getElementById('task-description').value = task.description || '';
            document.getElementById('task-priority').value = task.priority;
            document.getElementById('task-status').value = task.status;
            document.getElementById('task-category').value = task.category || '';
            document.getElementById('task-project').value = task.project_id || '';
            document.getElementById('task-tags').value = task.tags ? task.tags.join(', ') : '';
            
            if (task.due_date) {
                const date = new Date(task.due_date);
                document.getElementById('task-due-date').value = date.toISOString().slice(0, 16);
            }
        }
    }
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.remove('active');
}

function editTask(taskId) {
    openTaskModal(taskId);
}

function initializeTaskForm() {
    document.getElementById('task-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const taskData = {
            name: document.getElementById('task-name').value,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            status: document.getElementById('task-status').value,
            category: document.getElementById('task-category').value,
            project_id: document.getElementById('task-project').value,
            tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(t => t),
            user_id: userid
        };
        
        const taskId = document.getElementById('task-id').value;
        if (taskId) {
            taskData.id = taskId;
        }
        
        const dueDate = document.getElementById('task-due-date').value;
        if (dueDate) {
            taskData.due_date = new Date(dueDate).toISOString();
        }
        
        await saveTask(taskData);
    });
}

// Project Modal
function openProjectModal() {
    document.getElementById('project-modal').classList.add('active');
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
    document.getElementById('project-form').reset();
}

function initializeProjectForm() {
    document.getElementById('project-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const projectData = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color: document.getElementById('project-color').value,
            user_id: userid
        };
        
        await saveProject(projectData);
    });
}

// Utilities
function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return decodeURIComponent(value);
    }
    return null;
}

function getPriorityColor(priority) {
    const colors = {
        low: '#4caf50',
        medium: '#ff9800',
        high: '#f57c00',
        critical: '#f44336'
    };
    return colors[priority] || colors.medium;
}

function logout() {
    document.cookie = 'userID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.href = '/';
}
