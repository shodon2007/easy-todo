import path from 'node:path';
import { logger } from '../logger.js';
import fs from "node:fs";
import { randomUUID } from 'node:crypto';
import { getTodoItemFields } from '../utils/todoItemFields.js';
export const command = "todos";
export const describe = 'Display todos'
export const aliases = ['g']

export function builder(yargs) {
    return yargs
        .option('category', {
            type: 'string',
            description: 'Категория',
            default: null,
        })
        .option('urgent', {
            type: 'boolean',
            description: 'Срочность',
            default: null,
        })
        .option('completed', {
            type: 'boolean',
            description: 'Выполнено',
            default: null,
        })
        .option('pending', {
            type: 'boolean',
            description: 'Ожидает выполнения',
            default: null,
        })
}

const convertToReadableTodo = (todo) => {
    return {
        ["Идентификатор"]: todo.id,
        ["Заголовок"]: todo.title,
        ["Описание"]: todo.descr,
        ["Категория"]: todo.category,
        ["Дата выполнения"]: new Date(todo.dueDate).toString(),
        ["Важная задача?"]: todo.isUrgent ? "Да" : "Нет",
        ["Выполнено?"]: todo.completed ? "Да" : "Нет",
    }
}

const getTodos = () => {
    let todos = null;
    try {
        todos = JSON.parse(fs.readFileSync(path.resolve("storage", "tasks.json")));
    } catch (e) {
        fs.writeFileSync(path.resolve("storage", "tasks.json"), "[]");
        return [];
    }

    return todos;
}

const requiredPrompt = async (field, callback) => {
    const res = await callback();
    if (res === null || res === "" || !res) {
        logger.error(`Поле ${field} Обязательное`);
        return requiredPrompt(field, callback);
    }

    return res;
}

const todoList = async (argv) => {
    let todos = getTodos();
    const category = argv.category;
    const completed = argv.completed;
    const pending = argv.pending;
    const urgent = argv.urgent;
    if (category) {
        todos = todos.filter(todo =>
            todo.category === category
        );
    }
    if (completed) {
        todos = todos.filter(todo =>
            todo.completed === true
        );
    }
    if (urgent) {
        todos = todos.filter(todo =>
            todo.IsUrgent === true
        );
    }
    if (pending) {
        todos = todos.filter(todo =>
            todo.completed === false
        );
    }

    console.table(todos.map(todo => convertToReadableTodo(todo)));
}

const getDueDate = async () => {
    const dueDate = await logger.prompt('Срок выполнения', {
        type: 'text',
        hint: "YYYY-MM-DDTHH:mm:ss.sssZ"
    });

    const isNotValid = isNaN(new Date(dueDate));
    if (isNotValid) {
        logger.error(`Неверная дата введите в виде:YYYY-MM-DDTHH:mm:ss.sssZ `);
        return getDueDate();
    }
    return dueDate;
}

const createTodo = async () => {
    const title = await requiredPrompt("title", async () => {
        return logger.prompt('Заголовок задачи', {
            type: 'text',
        });
    });
    const descr = await logger.prompt('Описание задачи', {
        type: 'text',
    });
    const category = await logger.prompt('Категория', {
        type: 'text',
    });

    const dueDate = await getDueDate()
    const isUrgent = await logger.prompt('Cрочная задача', {
        type: 'select',
        options: [
            {
                label: "Да",
                value: true,
            },
            {
                label: "Нет",
                value: false
            }
        ]
    });
    const completed = await logger.prompt('Уже выполнено?', {
        type: 'select',
        options: [
            {
                label: "Да",
                value: true,
            },
            {
                label: "Нет",
                value: false
            }
        ]
    });

    const todo = {
        id: randomUUID(),
        title,
        descr,
        category,
        dueDate,
        isUrgent,
        completed,
    };

    const todos = getTodos();
    todos.push(todo);
    fs.writeFileSync(path.resolve("storage", "tasks.json"), JSON.stringify(todos));
}

const editTodo = async () => {
    const todos = await getTodos();
    const todo = await logger.prompt("Выберите задачу", {
        type: 'select',
        options: structuredClone(todos).map(todo => ({ label: todo.title, value: todo }))
    });

    const field = await logger.prompt("Выберите Поле которое хотите отредактировать", {
        type: 'select',
        options: Object.entries(getTodoItemFields())
            .reduce((acc, [value, label]) => {
                return [
                    ...acc,
                    {
                        value,
                        label
                    }
                ]
            }, [])
    });

    if (field === "title") {
        const title = await requiredPrompt("title", async () => {
            return logger.prompt('Заголовок задачи', {
                type: 'text',
            });
        });
        todo.title = title;
    }
    if (field === "descr") {
        todo.descr = await logger.prompt('Описание задачи', {
            type: 'text',
        });
    }
    if (field === "category") {
        todo.category = await logger.prompt('Категория', {
            type: 'text',
        });
    }
    if (field === "dueDate") {
        todo.dueDate = await getDueDate()
    }
    if (field === "isUrgent") {
        todo.isUrgent = await logger.prompt('Cрочная задача', {
            type: 'select',
            options: [
                {
                    label: "Да",
                    value: true,
                },
                {
                    label: "Нет",
                    value: false
                }
            ]
        });
    }

    if (field === "completed") {
        todo.completed = await logger.prompt('Уже выполнено?', {
            type: 'select',
            options: [
                {
                    label: "Да",
                    value: true,
                },
                {
                    label: "Нет",
                    value: false
                }
            ]
        });
    }

    const updatedTodos = [
        ...todos.filter(el => el.id !== todo.id),
        todo
    ];
    fs.writeFileSync(path.resolve("storage", "tasks.json"), JSON.stringify(updatedTodos));
    logger.log("Успешно обновлено!")
}

const deleteTodo = async () => {
    const todos = await getTodos();
    console.log(todos);
    const todo = await logger.prompt("Выберите задачу", {
        type: 'select',
        options: structuredClone(todos).map(todo => ({ label: todo.title, value: todo }))
    });

    const needDelete = logger.prompt("Точно хотите удалить задачу?", {
        type: "select",
        options: [
            {
                label: "Да, удалить задачу",
                value: true
            },
            {
                label: "Не удалять задачу",
                value: false
            }
        ]
    });

    if (needDelete) {
        const updatedTodos = [...todos.filter(el => el.id !== todo.id)];
        fs.writeFileSync(path.resolve("storage", "tasks.json"), JSON.stringify(updatedTodos));
        logger.log("Успешно удален!");
    } else {
        logger.log("Вы отменили удаление!");
    }
}

export async function handler(argv) {
    logger.log(`Добро пожаловать в туду`);

    const action = await logger.prompt('Что вы хотите?', {
        type: 'select',
        options: [
            {
                label: "Создать задачу",
                value: "create_todo",
            },
            {
                label: "Список задач",
                value: "todo_list",
            },
            {
                label: "Изменить задачу",
                value: "edit_list",
            },
            {
                label: "Удалить задачу",
                value: "delete_list",
            },
        ]
    });

    if (action === "create_todo") {
        createTodo();
    }
    if (action === "todo_list") {
        todoList(argv);
    }
    if (action === "edit_list") {
        editTodo();
    }
    if (action === "delete_list") {
        deleteTodo();
    }

    logger.log(`${action}, Ciao!`)
}