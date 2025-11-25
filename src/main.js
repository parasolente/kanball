import { parse } from 'marked';
let balls = document.querySelectorAll('.ball');
const modal = document.getElementById('modalOverlay');

let activeBall = null;
let startX = 0, startY = 0;
let isDragging = false;

balls.forEach(ball => {
    ball.addEventListener('mousedown', startDrag);
    ball.addEventListener('touchstart', startDrag, { passive: false });
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('active');
    }
});

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag, { passive: false });
document.addEventListener('mouseup', endDrag);
document.addEventListener('touchend', endDrag);

function startDrag(e) {
    if (e.type === 'touchstart') e.preventDefault();
    activeBall = e.target;
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    isDragging = false;
    activeBall.style.transition = 'none';
    activeBall.style.zIndex = 1000;
}

let rafId = null;

function drag(e) {
    if (!activeBall) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const currentX = point.clientX;
    const currentY = point.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) isDragging = true;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        if (activeBall) {
            activeBall.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(1.1)`;
        }
    });
}

function endDrag(e) {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    if (!activeBall) return;
    if (!isDragging) {
        activeBall.style.transform = '';
        activeBall.style.zIndex = '';
        activeBall.style.transition = 'transform 0.1s';
        openTaskModal(activeBall);
        activeBall = null;
        return;
    }
    activeBall.style.transition = 'transform 0.2s';
    activeBall.style.zIndex = '';
    activeBall.style.transform = '';

    const point = e.changedTouches ? e.changedTouches[0] : e;
    const clientX = point.clientX;
    const clientY = point.clientY;

    activeBall.style.display = 'none';
    let elementBelow = document.elementFromPoint(clientX, clientY);
    activeBall.style.display = 'block';

    let targetBox = elementBelow ? elementBelow.closest('.column') : null;

    if (targetBox) {
        const boxArea = targetBox.querySelector('.box-area');
        if (activeBall.parentElement !== boxArea) {
            boxArea.appendChild(activeBall);
        }

        const boxRect = targetBox.getBoundingClientRect();
        const colId = targetBox.id;

        let relativeX = clientX - boxRect.left - (activeBall.offsetWidth / 2);
        let relativeY = clientY - boxRect.top - (activeBall.offsetHeight / 2);

        let percentLeft = (relativeX / boxRect.width) * 100;
        let percentTop = (relativeY / boxRect.height) * 100;

        const ballHeightPercent = 7.2;
        const ballWidthPercent = 12.1;

        let minTop = 15.4;
        let maxTop = 90.0 - ballHeightPercent;

        let minLeft, maxLeft;

        if (colId === 'col-1') {
            minLeft = 28.5;
            maxLeft = 95.6 - ballWidthPercent;
        } else if (colId === 'col-2') {
            minLeft = 17.8;
            maxLeft = 82.2 - ballWidthPercent;
        } else if (colId === 'col-3') {
            minLeft = 4.4;
            maxLeft = 71.6 - ballWidthPercent;
        }

        percentLeft = Math.max(minLeft, Math.min(maxLeft, percentLeft));
        percentTop = Math.max(minTop, Math.min(maxTop, percentTop));

        activeBall.style.left = percentLeft + '%';
        activeBall.style.top = percentTop + '%';

        saveState();
    }
    activeBall = null;
}

let tasks = {};

async function fetchTasks() {
    try {
        const customTasks = JSON.parse(localStorage.getItem('customTasks') || '[]');
        const boxArea = document.querySelector('#col-1 .box-area');
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');

        customTasks.forEach((taskData, index) => {
            const id = taskData.id || `ball-${index + 1}`;

            if (deletedTasks.includes(id)) return;

            tasks[id] = taskData;

            let ball = document.getElementById(id);

            if (!ball) {
                ball = document.createElement('div');
                ball.className = 'ball';
                ball.id = id;
                ball.draggable = false;

                ball.addEventListener('mousedown', startDrag);
                ball.addEventListener('touchstart', startDrag, { passive: false });

                const minTop = 15.4;
                const maxTop = 82.8;
                const minLeft = 28.5;
                const maxLeft = 83.5;

                const randomTop = Math.random() * (maxTop - minTop) + minTop;
                const randomLeft = Math.random() * (maxLeft - minLeft) + minLeft;

                ball.style.top = `${randomTop}%`;
                ball.style.left = `${randomLeft}%`;

                if (boxArea) {
                    boxArea.appendChild(ball);
                }
            }

            setTimeout(() => {
                ball.classList.add('loaded');
            }, 100);
        });

        balls = document.querySelectorAll('.ball');

        loadState();
        saveState();
        updateBallColors();
        updateHeader();

    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

const sendBtn = document.getElementById('sendBtn');
if (sendBtn) {
    sendBtn.addEventListener('click', () => {
        const selectedColorInput = document.querySelector('input[name="color"]:checked');

        if (selectedColorInput) {
            const subject = document.getElementById('modalSubject').textContent;
            const title = document.getElementById('modalTitle').textContent;
            const description = document.getElementById('modalDescription').innerText;

            const dateInputDate = document.getElementById('modalDateInputDate');
            const dateInputTime = document.getElementById('modalDateInputTime');
            let formattedDate = 'Sin fecha';
            let rawDate = new Date().toISOString().split('T')[0];

            if (dateInputDate && dateInputDate.value) {
                let timeValue = dateInputTime && dateInputTime.value ? dateInputTime.value : '00:00';
                const fullDateString = `${dateInputDate.value}T${timeValue}`;
                const dateObj = new Date(fullDateString);
                rawDate = dateInputDate.value;

                const options = {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                };
                formattedDate = dateObj.toLocaleDateString('es-ES', options);
                formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            }

            const colorValue = selectedColorInput.value;

            const newId = `ball-custom-${Date.now()}`;

            const newTask = {
                id: newId,
                subject: subject,
                title: title,
                description: description,
                dueDate: formattedDate,
                customColor: colorValue,
                date: rawDate
            };

            const customTasks = JSON.parse(localStorage.getItem('customTasks') || '[]');
            customTasks.push(newTask);
            localStorage.setItem('customTasks', JSON.stringify(customTasks));

            tasks[newId] = newTask;

            const ball = document.createElement('div');
            ball.className = 'ball';
            ball.id = newId;
            ball.draggable = false;
            ball.addEventListener('mousedown', startDrag);
            ball.addEventListener('touchstart', startDrag, { passive: false });

            const minTop = 15.4;
            const maxTop = 82.8;
            const minLeft = 28.5;
            const maxLeft = 83.5;
            const randomTop = Math.random() * (maxTop - minTop) + minTop;
            const randomLeft = Math.random() * (maxLeft - minLeft) + minLeft;
            ball.style.top = `${randomTop}%`;
            ball.style.left = `${randomLeft}%`;

            const boxArea = document.querySelector('#col-1 .box-area');
            if (boxArea) boxArea.appendChild(ball);

            if (colorValue === 'Rojo') ball.classList.add('red');
            else if (colorValue === 'Amarillo') ball.classList.add('yellow');
            else if (colorValue === 'Verde') ball.classList.add('green');

            setTimeout(() => {
                ball.classList.add('loaded');
            }, 100);

            balls = document.querySelectorAll('.ball');
            saveState();
            updateHeader();

            const overlay = document.getElementById('modalOverlay');
            overlay.classList.remove('active');

            const viewTaskFooter = document.getElementById('viewTaskFooter');
            const newTaskFooter = document.getElementById('newTaskFooter');
            if (viewTaskFooter) viewTaskFooter.style.display = 'flex';
            if (newTaskFooter) newTaskFooter.style.display = 'none';

        } else {
            alert('Por favor selecciona un color.');
        }
    });
}

function openTaskModal(ball) {
    if (!ball) return;
    const task = tasks[ball.id];
    if (task) {
        const subjectEl = document.getElementById('modalSubject');
        const titleEl = document.getElementById('modalTitle');
        const descriptionEl = document.getElementById('modalDescription');
        const dateTextEl = document.getElementById('modalDateText');
        const dateInputsEl = document.getElementById('modalDateInputs');

        subjectEl.contentEditable = "false";
        titleEl.contentEditable = "false";
        descriptionEl.contentEditable = "false";

        dateTextEl.style.display = 'block';
        if (dateInputsEl) dateInputsEl.style.display = 'none';

        const taskCard = document.getElementById('taskCard');
        const infoCard = document.getElementById('infoCard');
        if (taskCard) {
            taskCard.style.display = 'block';
            taskCard.classList.remove('full-screen');
        }
        if (infoCard) infoCard.style.display = 'none';

        subjectEl.textContent = task.subject;
        titleEl.textContent = task.title;

        const descriptionContainer = document.getElementById('modalDescriptionContainer');
        const readMoreBtn = document.getElementById('readMoreBtn');

        let descriptionContent = task.description;

        if (task.id && task.id.toString().includes('custom')) {
            descriptionContent = descriptionContent
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        descriptionEl.innerHTML = parse(descriptionContent, { breaks: true });

        descriptionContainer.classList.remove('truncated');

        const plainText = descriptionEl.textContent || descriptionEl.innerText;
        const wordCount = plainText.split(/\s+/).length;

        if (wordCount > 120 || plainText.length > 500) {
            readMoreBtn.style.display = 'block';
            descriptionContainer.classList.add('truncated');
        } else {
            readMoreBtn.style.display = 'none';
        }

        const editBtn = document.getElementById('editBtn');
        if (editBtn) editBtn.style.display = 'none';

        dateTextEl.textContent = task.dueDate;

        const viewTaskFooter = document.getElementById('viewTaskFooter');
        const newTaskFooter = document.getElementById('newTaskFooter');

        if (viewTaskFooter) viewTaskFooter.style.display = 'flex';
        if (newTaskFooter) newTaskFooter.style.display = 'none';

        const fileLink = document.querySelector('.footer a:nth-child(1)');
        const taskLink = document.querySelector('.footer a:nth-child(2)');

        if (task.fileUrl) {
            fileLink.href = task.fileUrl;
            fileLink.target = '_blank';
            fileLink.style.display = 'inline-block';
        } else {
            fileLink.style.display = 'none';
        }

        if (task.taskUrl) {
            taskLink.href = task.taskUrl;
            taskLink.target = '_blank';
            taskLink.style.display = 'inline-block';
        } else {
            taskLink.style.display = 'none';
        }

        const overlay = document.getElementById('modalOverlay');
        overlay.classList.add('active');
    }
}

function saveState() {
    const state = {};
    const currentBalls = document.querySelectorAll('.ball');
    currentBalls.forEach(ball => {
        const col = ball.closest('.column');
        if (col) {
            state[ball.id] = {
                colId: col.id,
                left: ball.style.left,
                top: ball.style.top
            };
        }
    });
    localStorage.setItem('kanbanState', JSON.stringify(state));
}

function loadState() {
    const state = JSON.parse(localStorage.getItem('kanbanState'));
    if (!state) return;

    balls.forEach(ball => {
        const ballState = state[ball.id];
        if (ballState) {
            const targetCol = document.getElementById(ballState.colId);
            if (targetCol) {
                const boxArea = targetCol.querySelector('.box-area');
                if (ball.parentElement !== boxArea) {
                    boxArea.appendChild(ball);
                }
                ball.style.left = ballState.left;
                ball.style.top = ballState.top;
            }
        }
    });
}

function updateBallColors() {
    const referenceDate = new Date();
    referenceDate.setHours(0, 0, 0, 0);

    balls.forEach(ball => {
        const task = tasks[ball.id];
        if (task) {
            ball.classList.remove('red', 'yellow', 'green', 'blue');

            if (task.customColor) {
                if (task.customColor === 'Rojo') ball.classList.add('red');
                else if (task.customColor === 'Amarillo') ball.classList.add('yellow');
                else if (task.customColor === 'Verde') ball.classList.add('green');
            } else if (task.date) {
                const taskDate = new Date(task.date + 'T00:00:00');
                const diffTime = taskDate - referenceDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays <= 3) {
                    ball.classList.add('red');
                } else if (diffDays <= 7) {
                    ball.classList.add('yellow');
                } else {
                    ball.classList.add('green');
                }
            }
        }
    });
}

function updateHeader() {
    const ballCount = document.querySelectorAll('.ball').length;
    const taskCountElement = document.getElementById('taskCount');
    if (taskCountElement) {
        taskCountElement.textContent = `${ballCount} Tareas Pendientes`;
    }

    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        let dateString = now.toLocaleDateString('es-ES', options);

        dateString = dateString.replace(',', '');

        dateElement.textContent = `Hoy es ${dateString}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();

    const readMoreBtn = document.getElementById('readMoreBtn');
    const editBtn = document.getElementById('editBtn');
    const closeFullScreenBtn = document.getElementById('closeFullScreenBtn');
    const taskCard = document.getElementById('taskCard');
    const descriptionElement = document.getElementById('modalDescription');

    if (descriptionElement) {
        descriptionElement.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text');
            document.execCommand('insertText', false, text);
        });
    }

    const descriptionContainer = document.getElementById('modalDescriptionContainer');
    if (descriptionContainer && descriptionElement) {
        descriptionContainer.addEventListener('click', (e) => {
            if (descriptionElement.isContentEditable && e.target !== descriptionElement && e.target.tagName !== 'BUTTON') {
                descriptionElement.focus();
            }
        });
    }

    if (readMoreBtn) {
        readMoreBtn.addEventListener('click', () => {
            const descriptionContainer = document.getElementById('modalDescriptionContainer');
            taskCard.classList.add('full-screen');
            descriptionContainer.classList.remove('truncated');
            closeFullScreenBtn.style.display = 'block';
            readMoreBtn.style.display = 'none';
        });
    }

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const descriptionContainer = document.getElementById('modalDescriptionContainer');
            taskCard.classList.add('full-screen');
            descriptionContainer.classList.remove('truncated');
            closeFullScreenBtn.style.display = 'block';
            editBtn.style.display = 'none';
        });
    }

    const subjectEl = document.getElementById('modalSubject');
    const titleEl = document.getElementById('modalTitle');

    if (subjectEl) {
        subjectEl.addEventListener('input', () => {
            if (subjectEl.innerText.length > 40) {
                subjectEl.innerText = subjectEl.innerText.substring(0, 40);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(subjectEl);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    }

    if (titleEl) {
        titleEl.addEventListener('input', () => {
            if (titleEl.innerText.length > 60) {
                titleEl.innerText = titleEl.innerText.substring(0, 60);
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(titleEl);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
        });
    }

    if (descriptionElement) {
        descriptionElement.addEventListener('input', () => {
            const style = window.getComputedStyle(descriptionElement);
            const lineHeight = parseFloat(style.lineHeight);

            if (!isNaN(lineHeight) && lineHeight > 0) {
                const height = descriptionElement.scrollHeight;
                const lines = height / lineHeight;

                if (lines >= 11) {
                    if (!taskCard.classList.contains('full-screen')) {
                        if (editBtn) editBtn.click();
                    }
                }
            }
        });
    }

    if (closeFullScreenBtn) {
        closeFullScreenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const descriptionContainer = document.getElementById('modalDescriptionContainer');
            taskCard.classList.remove('full-screen');

            closeFullScreenBtn.style.display = 'none';

            const isEditMode = descriptionElement.isContentEditable;

            if (isEditMode) {
                if (editBtn) editBtn.style.display = 'block';
                descriptionContainer.classList.add('truncated');
            } else {
                descriptionContainer.classList.add('truncated');
                if (readMoreBtn) readMoreBtn.style.display = 'block';
            }
        });
    }

    const delBtn = document.getElementById('delBtn');
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            const col3 = document.getElementById('col-3');
            if (col3) {
                const ballsInCol3 = col3.querySelectorAll('.ball');

                const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '[]');

                ballsInCol3.forEach(ball => {
                    deletedTasks.push(ball.id);
                    ball.remove();
                });

                localStorage.setItem('deletedTasks', JSON.stringify(deletedTasks));

                balls = document.querySelectorAll('.ball');

                saveState();
                updateHeader();
            }
        });
    }

    const addBtn = document.getElementById('addBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const subjectEl = document.getElementById('modalSubject');
            const titleEl = document.getElementById('modalTitle');
            const descriptionEl = document.getElementById('modalDescription');
            const dateTextEl = document.getElementById('modalDateText');
            const dateInputsEl = document.getElementById('modalDateInputs');
            const dateInputDate = document.getElementById('modalDateInputDate');
            const dateInputTime = document.getElementById('modalDateInputTime');

            subjectEl.contentEditable = "true";
            titleEl.contentEditable = "true";
            descriptionEl.contentEditable = "true";

            dateTextEl.style.display = 'none';
            dateTextEl.textContent = ''; // Clear stale data

            if (dateInputsEl) dateInputsEl.style.display = 'flex';
            if (dateInputDate) dateInputDate.value = '';
            if (dateInputTime) dateInputTime.value = '';

            subjectEl.textContent = 'NUEVA TAREA';
            titleEl.textContent = 'Título de la Tarea';
            descriptionEl.innerHTML = 'Descripción de la nueva tarea...';

            const descriptionContainer = document.getElementById('modalDescriptionContainer');
            const readMoreBtn = document.getElementById('readMoreBtn');
            const editBtn = document.getElementById('editBtn');

            descriptionContainer.classList.remove('truncated');

            if (readMoreBtn) readMoreBtn.style.display = 'none';
            if (editBtn) editBtn.style.display = 'block';

            const viewTaskFooter = document.getElementById('viewTaskFooter');
            const newTaskFooter = document.getElementById('newTaskFooter');

            if (viewTaskFooter) viewTaskFooter.style.display = 'none';
            if (newTaskFooter) newTaskFooter.style.display = 'flex';

            const overlay = document.getElementById('modalOverlay');
            const taskCard = document.getElementById('taskCard');
            const infoCard = document.getElementById('infoCard');

            if (taskCard) {
                taskCard.style.display = 'block';
                taskCard.classList.remove('full-screen');
            }
            if (infoCard) infoCard.style.display = 'none';

            overlay.classList.add('active');
        });
    }

    const infoBtn = document.getElementById('infoBtn');
    if (infoBtn) {
        infoBtn.addEventListener('click', () => {
            const overlay = document.getElementById('modalOverlay');
            const taskCard = document.getElementById('taskCard');
            const infoCard = document.getElementById('infoCard');

            if (taskCard) taskCard.style.display = 'none';
            if (infoCard) infoCard.style.display = 'block';

            overlay.classList.add('active');
        });
    }

    initMobileCanvas();
});

function initMobileCanvas() {
    const canvas = document.getElementById('mobile-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width, height;
    let canvasBalls = [];
    let animationFrameId;

    const colors = ['#5DDB89', '#FF5252', '#FFE55C'];

    class CanvasBall {
        constructor(x, y, radius, color) {
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.color = color;
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = (Math.random() - 0.5) * 1;
            this.isDragging = false;
            this.lastX = x;
            this.lastY = y;
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = 'black';
            ctx.stroke();
            ctx.closePath();
        }

        update() {
            if (!this.isDragging) {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x + this.radius > width) {
                    this.x = width - this.radius;
                    this.vx *= -1;
                } else if (this.x - this.radius < 0) {
                    this.x = this.radius;
                    this.vx *= -1;
                }

                if (this.y + this.radius > height) {
                    this.y = height - this.radius;
                    this.vy *= -1;
                } else if (this.y - this.radius < 0) {
                    this.y = this.radius;
                    this.vy *= -1;
                }
            }
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        // Check if we should be running
        if (width <= 768) {
            if (!animationFrameId) {
                initBalls();
                animate();
            }
        } else {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }
    }

    function initBalls() {
        canvasBalls = [];
        const numBalls = 12;
        for (let i = 0; i < numBalls; i++) {
            const radius = 50;
            const x = Math.random() * (width - radius * 2) + radius;
            const y = Math.random() * (height - radius * 2) + radius;
            const color = colors[Math.floor(Math.random() * colors.length)];
            canvasBalls.push(new CanvasBall(x, y, radius, color));
        }
    }

    function animate() {
        if (width > 768) return; // Stop if resized to desktop

        ctx.clearRect(0, 0, width, height);
        canvasBalls.forEach(ball => {
            ball.update();
            ball.draw();
        });
        animationFrameId = requestAnimationFrame(animate);
    }

    let dragBall = null;

    function handleStart(x, y) {
        for (let i = canvasBalls.length - 1; i >= 0; i--) {
            const b = canvasBalls[i];
            const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
            if (dist < b.radius) {
                dragBall = b;
                dragBall.isDragging = true;
                dragBall.lastX = x;
                dragBall.lastY = y;
                canvasBalls.splice(i, 1);
                canvasBalls.push(dragBall);
                break;
            }
        }
    }

    function handleMove(x, y) {
        if (dragBall) {
            dragBall.vx = x - dragBall.lastX;
            dragBall.vy = y - dragBall.lastY;
            dragBall.x = x;
            dragBall.y = y;
            dragBall.lastX = x;
            dragBall.lastY = y;
        }
    }

    function handleEnd() {
        if (dragBall) {
            dragBall.isDragging = false;
            dragBall = null;
        }
    }

    canvas.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => handleMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', e => {
        if (dragBall) {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('touchend', handleEnd);
    window.addEventListener('resize', resize);

    resize(); // Initial call
}
