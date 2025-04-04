"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { TaskForm } from "@/components/task/task-form"
import { updateTask } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface KanbanBoardProps {
  projectId: string
  tasks: any[]
  onTasksChange?: () => void
}

export function KanbanBoard({ projectId, tasks = [], onTasksChange }: KanbanBoardProps) {
  const { toast } = useToast()
  const [columns, setColumns] = useState({
    "To Do": {
      id: "To Do",
      title: "To Do",
      taskIds: [] as string[],
    },
    "In Progress": {
      id: "In Progress",
      title: "In Progress",
      taskIds: [] as string[],
    },
    Review: {
      id: "Review",
      title: "Review",
      taskIds: [] as string[],
    },
    Done: {
      id: "Done",
      title: "Done",
      taskIds: [] as string[],
    },
  })
  const [taskMap, setTaskMap] = useState<Record<string, any>>({})
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [currentTask, setCurrentTask] = useState<any>(null)

  useEffect(() => {
    if (tasks.length > 0) {
      // Create a map of tasks by ID
      const newTaskMap: Record<string, any> = {}
      tasks.forEach((task) => {
        newTaskMap[task.id] = task
      })
      setTaskMap(newTaskMap)

      // Group tasks by status
      const newColumns = { ...columns }
      Object.keys(newColumns).forEach((columnId) => {
        newColumns[columnId].taskIds = []
      })

      tasks.forEach((task) => {
        const status = task.status || "To Do"
        if (newColumns[status]) {
          newColumns[status].taskIds.push(task.id)
        } else {
          // If status doesn't match any column, put in To Do
          newColumns["To Do"].taskIds.push(task.id)
        }
      })

      setColumns(newColumns)
    }
  }, [tasks])

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area
    if (!destination) return

    // If dropped in the same place
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Get the source and destination columns
    const sourceColumn = columns[source.droppableId]
    const destColumn = columns[destination.droppableId]

    // If moving within the same column
    if (sourceColumn === destColumn) {
      const newTaskIds = Array.from(sourceColumn.taskIds)
      newTaskIds.splice(source.index, 1)
      newTaskIds.splice(destination.index, 0, draggableId)

      const newColumn = {
        ...sourceColumn,
        taskIds: newTaskIds,
      }

      setColumns({
        ...columns,
        [newColumn.id]: newColumn,
      })
    } else {
      // Moving from one column to another
      const sourceTaskIds = Array.from(sourceColumn.taskIds)
      sourceTaskIds.splice(source.index, 1)

      const destTaskIds = Array.from(destColumn.taskIds)
      destTaskIds.splice(destination.index, 0, draggableId)

      setColumns({
        ...columns,
        [sourceColumn.id]: {
          ...sourceColumn,
          taskIds: sourceTaskIds,
        },
        [destColumn.id]: {
          ...destColumn,
          taskIds: destTaskIds,
        },
      })

      // Update the task status in the database
      try {
        await updateTask(draggableId, { status: destColumn.id })

        toast({
          title: "Task updated",
          description: `Task moved to ${destColumn.title}`,
        })

        // Update the local task map
        setTaskMap({
          ...taskMap,
          [draggableId]: {
            ...taskMap[draggableId],
            status: destColumn.id,
          },
        })
      } catch (error) {
        console.error("Error updating task status:", error)
        toast({
          title: "Error",
          description: "Failed to update task status. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleEditTask = (task: any) => {
    setCurrentTask(task)
    setIsTaskFormOpen(true)
  }

  const handleTaskFormClose = () => {
    setIsTaskFormOpen(false)
    setCurrentTask(null)
    if (onTasksChange) {
      onTasksChange()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800/20 dark:text-red-400"
      case "medium":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-800/20 dark:text-amber-400"
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.values(columns).map((column) => (
          <div key={column.id} className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">{column.title}</h3>
              <Badge variant="outline">{column.taskIds.length}</Badge>
            </div>
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 min-h-[300px]"
                >
                  {column.taskIds.map((taskId, index) => {
                    const task = taskMap[taskId]
                    if (!task) return null

                    return (
                      <Draggable key={taskId} draggableId={taskId} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="mb-3"
                          >
                            <Card
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleEditTask(task)}
                            >
                              <CardContent className="p-3">
                                <div className="mb-2">
                                  <h4 className="font-medium text-sm">{task.title}</h4>
                                  {task.description && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center justify-between">
                                  <Badge className={getPriorityColor(task.priority)}>{task.priority || "None"}</Badge>
                                  {task.assignee ? (
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={task.assignee_avatar} alt={task.assignee} />
                                      <AvatarFallback>{task.assignee.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  ) : null}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    )
                  })}
                  {provided.placeholder}
                  {column.id === "To Do" && (
                    <Button
                      variant="ghost"
                      className="w-full mt-2 text-muted-foreground"
                      onClick={() => {
                        setCurrentTask(null)
                        setIsTaskFormOpen(true)
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2 h-4 w-4"
                      >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      Add Task
                    </Button>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>

      {isTaskFormOpen && (
        <TaskForm isOpen={isTaskFormOpen} onClose={handleTaskFormClose} projectId={projectId} task={currentTask} />
      )}
    </DragDropContext>
  )
}

